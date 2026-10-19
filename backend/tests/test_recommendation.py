from fastapi.testclient import TestClient

from app.main import app, verified_user
from app.recommendation import Recommendation, RecommendationRequest, remaining_balance


def payload():
    return {
        'target': {'kcal': 2200, 'protein': 130, 'fat': 70, 'carbs': 250},
        'eaten': {'kcal': 900, 'protein': 42, 'fat': 25, 'carbs': 110},
        'recent_meals': ['Овсянка', 'Рис с овощами'],
        'avoid': 'орехи',
    }


def test_remaining_balance_uses_confirmed_daily_totals():
    remaining = remaining_balance(RecommendationRequest.model_validate(payload()))
    assert remaining.model_dump() == {'kcal': 1300.0, 'protein': 88.0, 'fat': 45.0, 'carbs': 140.0}


def test_recommendation_requires_account_and_returns_editable_estimate(monkeypatch):
    client = TestClient(app)
    assert client.post('/api/recommend', json=payload()).status_code == 401

    async def fake_recommend(_payload):
        return Recommendation(name='Курица с овощами', detail='Порция 350 г', kcal=440,
                              protein=40, fat=12, carbs=43, reason='Помогает добрать белок')

    monkeypatch.setattr('app.main.recommend', fake_recommend)
    app.dependency_overrides[verified_user] = lambda: 'test-recommend-user'
    try:
        response = client.post('/api/recommend', json=payload())
        assert response.status_code == 200
        assert response.json()['name'] == 'Курица с овощами'
    finally:
        app.dependency_overrides.clear()
