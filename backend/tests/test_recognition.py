from datetime import UTC, datetime, timedelta
from io import BytesIO

import pytest
from fastapi.testclient import TestClient
from PIL import Image
from pydantic import ValidationError

from app.main import app, verified_user
from app.recognition import FoodEstimate, HourlyLimiter, RecognitionResult, normalize_photo


def image_bytes(size=(120, 80), exif=None):
    output = BytesIO()
    options = {'exif': exif} if exif is not None else {}
    Image.new('RGB', size, '#bb8965').save(output, format='JPEG', **options)
    return output.getvalue()


def test_photo_is_validated_resized_and_stripped_of_metadata():
    exif = Image.Exif()
    exif[37510] = b'sensitive caption'
    clean = normalize_photo(image_bytes((1800, 1200), exif))
    with Image.open(BytesIO(clean)) as image:
        assert image.size == (1600, 1067)
        assert image.getexif().get(37510) is None
    with pytest.raises(ValueError):
        normalize_photo(b'not an image')
    with pytest.raises(ValueError):
        normalize_photo(b'x' * 5_000_001)


def test_estimates_reject_impossible_energy_and_limit_resets():
    with pytest.raises(ValidationError):
        FoodEstimate(name='Cake', grams=100, kcal=200, protein=100, fat=100,
                     carbs=100, confidence=.9, assumptions='')
    limiter = HourlyLimiter(limit=2)
    now = datetime(2026, 10, 19, tzinfo=UTC)
    assert limiter.allow('user-a', now)
    assert limiter.allow('user-a', now)
    assert not limiter.allow('user-a', now)
    assert limiter.allow('user-b', now)
    assert limiter.allow('user-a', now + timedelta(hours=1, seconds=1))


def test_photo_requires_login_and_returns_only_editable_estimate(monkeypatch):
    result = RecognitionResult(items=[
        FoodEstimate(name='Тестовое блюдо', grams=150, kcal=210, protein=12,
                     fat=8, carbs=23, confidence=.6, assumptions='Оценка порции')
    ], note='Проверить порцию')

    async def fake_recognize(**_kwargs):
        return result

    monkeypatch.setattr('app.main.recognize', fake_recognize)
    client = TestClient(app)
    response = client.post('/api/recognize/photo', files={'file': ('meal.jpg', image_bytes(), 'image/jpeg')})
    assert response.status_code == 401

    app.dependency_overrides[verified_user] = lambda: 'test-user'
    try:
        response = client.post('/api/recognize/photo', files={'file': ('meal.jpg', image_bytes(), 'image/jpeg')})
        assert response.status_code == 200
        assert response.json()['items'][0]['grams'] == 150
    finally:
        app.dependency_overrides.clear()


def test_audio_requires_login_and_rejects_invalid_upload(monkeypatch):
    async def fake_recognize(**_kwargs):
        return RecognitionResult(items=[
            FoodEstimate(name='Яблоко', grams=180, kcal=95, protein=.5,
                         fat=.3, carbs=25, confidence=.5, assumptions='Средний размер')
        ], note='Проверить порцию')

    monkeypatch.setattr('app.main.recognize', fake_recognize)
    client = TestClient(app)
    response = client.post('/api/recognize/audio', files={'file': ('meal.webm', b'x' * 150, 'audio/webm')})
    assert response.status_code == 401

    app.dependency_overrides[verified_user] = lambda: 'audio-user'
    try:
        response = client.post('/api/recognize/audio', files={'file': ('meal.txt', b'x' * 150, 'text/plain')})
        assert response.status_code == 415
        response = client.post('/api/recognize/audio', files={'file': ('meal.webm', b'x', 'audio/webm')})
        assert response.status_code == 422
        response = client.post('/api/recognize/audio', files={'file': ('meal.webm', b'x' * 150, 'audio/webm')})
        assert response.status_code == 200
    finally:
        app.dependency_overrides.clear()
