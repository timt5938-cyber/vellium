import pytest
from fastapi.testclient import TestClient

from app.main import app, verified_user
from app.products import Product, normalize_barcode


def test_gtin_and_gs1_datamatrix_validation():
    assert normalize_barcode('3017620422003') == '3017620422003'
    assert normalize_barcode(']d20103017620422003') == '03017620422003'
    with pytest.raises(ValueError):
        normalize_barcode('3017620422004')
    with pytest.raises(ValueError):
        normalize_barcode('https://example.com/product')


def test_product_lookup_is_authenticated_and_has_source(monkeypatch):
    async def fake_lookup(code: str):
        assert code == '3017620422003'
        return Product(barcode=code, name='Nutella', kcal=539,
                       protein=6.3, fat=30.9, carbs=57.5,
                       source_url=f'https://world.openfoodfacts.org/product/{code}')

    monkeypatch.setattr('app.main.lookup_product', fake_lookup)
    client = TestClient(app)
    assert client.get('/api/products/3017620422003').status_code == 401
    app.dependency_overrides[verified_user] = lambda: 'product-user'
    try:
        assert client.get('/api/products/3017620422004').status_code == 422
        response = client.get('/api/products/3017620422003')
        assert response.status_code == 200
        assert response.json()['source_url'].endswith('/3017620422003')
    finally:
        app.dependency_overrides.clear()
