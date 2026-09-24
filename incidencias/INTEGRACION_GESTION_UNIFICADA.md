# Cambio necesario en Gestión Unificada

El botón **Gestionar incidencias** debe llamar desde el backend a Incidencias y después redirigir al usuario.

## Pseudocódigo servidor

```python
payload = {
    "source_type": "order" if es_pedido else "reservation",
    "source_ref": referencia,
    "data": datos_que_ya_conoce_gestion_unificada,
}

r = requests.post(
    INCIDENCIAS_URL + "/api/handoff",
    json=payload,
    headers={"X-Paddy-Handoff-Secret": PADDY_HANDOFF_SECRET},
    timeout=10,
)
r.raise_for_status()
return redirect(r.json()["open_url"])
```

No pasar email, teléfono, dirección ni nombre en parámetros de URL.
