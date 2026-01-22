from src.app import create_app


def test_index():
    app = create_app()
    client = app.test_client()
    rv = client.get('/')
    assert rv.status_code == 200
    assert b'Hello from Flask backend' in rv.data
