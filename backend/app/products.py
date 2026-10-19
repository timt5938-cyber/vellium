import re

import httpx
from pydantic import BaseModel, Field, ValidationError


class Product(BaseModel):
    barcode: str
    name: str = Field(min_length=1, max_length=160)
    kcal: float = Field(ge=0, le=1000)
    protein: float = Field(ge=0, le=100)
    fat: float = Field(ge=0, le=100)
    carbs: float = Field(ge=0, le=100)
    source_url: str


def normalize_barcode(raw: str) -> str:
    value = raw.strip().removeprefix(']d2')
    match = re.search(r'(?:\(01\)|^01)(\d{14})', value)
    code = match.group(1) if match else value
    if not re.fullmatch(r'\d{8}|\d{12,14}', code):
        raise ValueError('Нужен EAN, UPC или GS1 DataMatrix с GTIN.')
    digits = [int(char) for char in code]
    checksum = sum(digit * (3 if index % 2 == 0 else 1)
                   for index, digit in enumerate(reversed(digits[:-1])))
    if (10 - checksum % 10) % 10 != digits[-1]:
        raise ValueError('Контрольная цифра штрихкода не совпадает.')
    return code


async def lookup_product(code: str) -> Product | None:
    url = f'https://world.openfoodfacts.org/api/v2/product/{code}.json'
    async with httpx.AsyncClient(timeout=8) as client:
        response = await client.get(url, params={
            'fields': 'code,product_name,product_name_ru,nutriments,nutrition_data_per',
        }, headers={'User-Agent': 'VELLIUM/0.1 (https://github.com/timt5938-cyber/vellium)'})
    response.raise_for_status()
    payload = response.json()
    if payload.get('status') != 1:
        return None
    row = payload.get('product') or {}
    facts = row.get('nutriments') or {}
    name = row.get('product_name_ru') or row.get('product_name')
    keys = ['energy-kcal_100g', 'proteins_100g', 'fat_100g', 'carbohydrates_100g']
    if not isinstance(name, str) or not name.strip() or any(facts.get(key) is None for key in keys):
        return None
    try:
        return Product(barcode=code, name=name.strip()[:160],
                       kcal=facts[keys[0]], protein=facts[keys[1]],
                       fat=facts[keys[2]], carbs=facts[keys[3]],
                       source_url=f'https://world.openfoodfacts.org/product/{code}')
    except (ValidationError, TypeError, ValueError):
        return None
