import os
from uuid import UUID

import httpx
from google.genai import errors as genai_errors
from fastapi import Depends, FastAPI, File, Form, Header, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, ValidationError

from .recognition import HourlyLimiter, RecognitionResult, normalize_photo, recognize
from .products import Product, lookup_product, normalize_barcode
from .recommendation import Recommendation, RecommendationRequest, recommend

app = FastAPI(title='VELLIUM API', docs_url=None, redoc_url=None)
origins = [item.strip() for item in os.getenv('CORS_ORIGINS', 'http://127.0.0.1:5173').split(',') if item.strip()]
app.add_middleware(CORSMiddleware, allow_origins=origins, allow_methods=['GET', 'POST'],
                   allow_headers=['Authorization', 'Content-Type'])
limiter = HourlyLimiter()
product_limiter = HourlyLimiter(limit=30)
recommendation_limiter = HourlyLimiter(limit=8)


class TextRequest(BaseModel):
    text: str = Field(min_length=3, max_length=500)
    product_hint: str = Field(default='', max_length=1200)


@app.get('/api/health')
async def health():
    return {'status': 'ok', 'recognition_configured': bool(os.getenv('GEMINI_API_KEY') and os.getenv('GEMINI_MODEL'))}


async def verified_user(authorization: str | None = Header(default=None)) -> str:
    if not authorization or not authorization.startswith('Bearer '):
        raise HTTPException(status_code=401, detail='Войдите в аккаунт.')
    token = authorization[7:].strip()
    if not token or len(token) > 4096:
        raise HTTPException(status_code=401, detail='Недействительная сессия.')
    url = os.getenv('SUPABASE_URL', '').rstrip('/')
    key = os.getenv('SUPABASE_PUBLISHABLE_KEY', '')
    if not url.startswith('https://') or not key:
        raise HTTPException(status_code=503, detail='Авторизация не настроена.')
    try:
        async with httpx.AsyncClient(timeout=8) as client:
            response = await client.get(f'{url}/auth/v1/user', headers={
                'apikey': key, 'Authorization': f'Bearer {token}',
            })
        if response.status_code >= 500:
            raise HTTPException(status_code=503, detail='Проверка сессии временно недоступна.')
        if response.status_code != 200:
            raise HTTPException(status_code=401, detail='Сессия истекла. Войдите снова.')
        return str(UUID(response.json()['id']))
    except (httpx.RequestError, ValueError, KeyError) as exc:
        raise HTTPException(status_code=503, detail='Не удалось проверить сессию.') from exc


def check_limit(user_id: str):
    if not limiter.allow(user_id):
        raise HTTPException(status_code=429, detail='Лимит распознавания: 10 запросов в час.')


@app.post('/api/recognize/photo', response_model=RecognitionResult)
async def recognize_photo(file: UploadFile = File(...), description: str = Form(''),
                          product_hint: str = Form(''), user_id: str = Depends(verified_user)):
    if len(description) > 500 or len(product_hint) > 1200:
        raise HTTPException(status_code=422, detail='Описание слишком длинное.')
    if file.content_type not in {'image/jpeg', 'image/png', 'image/webp'}:
        raise HTTPException(status_code=415, detail='Нужен JPEG, PNG или WebP.')
    raw = await file.read(5_000_001)
    try:
        clean = normalize_photo(raw)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    check_limit(user_id)
    try:
        result = await recognize(photo=clean, description=description.strip(),
                                 product_hint=product_hint.strip())
    except (RuntimeError, ValidationError, genai_errors.APIError, httpx.TimeoutException) as exc:
        raise HTTPException(status_code=503, detail='Распознавание временно недоступно.') from exc
    if not result.items:
        raise HTTPException(status_code=422, detail='Не удалось распознать еду. Попробуйте другое фото или ручной ввод.')
    return result


@app.post('/api/recognize/text', response_model=RecognitionResult)
async def recognize_text(payload: TextRequest, user_id: str = Depends(verified_user)):
    check_limit(user_id)
    try:
        result = await recognize(description=payload.text, product_hint=payload.product_hint)
    except (RuntimeError, ValidationError, genai_errors.APIError, httpx.TimeoutException) as exc:
        raise HTTPException(status_code=503, detail='Распознавание временно недоступно.') from exc
    if not result.items:
        raise HTTPException(status_code=422, detail='Не удалось разобрать описание. Введите блюдо вручную.')
    return result


@app.post('/api/recommend', response_model=Recommendation)
async def recommend_next(payload: RecommendationRequest, user_id: str = Depends(verified_user)):
    if not recommendation_limiter.allow(user_id):
        raise HTTPException(status_code=429, detail='Лимит подсказок: 8 запросов в час.')
    try:
        return await recommend(payload)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except (RuntimeError, ValidationError, genai_errors.APIError, httpx.TimeoutException) as exc:
        raise HTTPException(status_code=503, detail='Подсказка временно недоступна.') from exc


@app.post('/api/recognize/audio', response_model=RecognitionResult)
async def recognize_audio(file: UploadFile = File(...), user_id: str = Depends(verified_user)):
    mime = (file.content_type or '').split(';')[0].lower()
    accepted = {'audio/webm': 'audio/webm', 'audio/ogg': 'audio/ogg',
                'audio/mp4': 'audio/m4a', 'audio/m4a': 'audio/m4a'}
    if mime not in accepted:
        raise HTTPException(status_code=415, detail='Нужна аудиозапись WebM, OGG или M4A.')
    raw = await file.read(5_000_001)
    if not 100 <= len(raw) <= 5_000_000:
        raise HTTPException(status_code=422, detail='Аудиозапись слишком короткая или больше 5 МБ.')
    check_limit(user_id)
    try:
        result = await recognize(audio=raw, audio_mime=accepted[mime])
    except (RuntimeError, ValidationError, genai_errors.APIError, httpx.TimeoutException) as exc:
        raise HTTPException(status_code=503, detail='Распознавание временно недоступно.') from exc
    if not result.items:
        raise HTTPException(status_code=422, detail='Не удалось разобрать запись. Введите блюдо вручную.')
    return result


@app.get('/api/products/{barcode}', response_model=Product)
async def get_product(barcode: str, user_id: str = Depends(verified_user)):
    try:
        code = normalize_barcode(barcode)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    if not product_limiter.allow(user_id):
        raise HTTPException(status_code=429, detail='Лимит поиска товаров: 30 запросов в час.')
    try:
        product = await lookup_product(code)
    except (httpx.HTTPError, ValueError) as exc:
        raise HTTPException(status_code=503, detail='Каталог временно недоступен.') from exc
    if product is None:
        raise HTTPException(status_code=404, detail='Товар или его КБЖУ не найдены. Введите данные с этикетки вручную.')
    return product
