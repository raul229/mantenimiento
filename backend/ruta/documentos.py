def normalizar_documento(numero):
    return ''.join(ch for ch in str(numero or '') if ch.isdigit())


def clasificar_documento(numero):
    """RUC 20 = empresa; RUC 10/15/17 o DNI = persona natural."""
    n = normalizar_documento(numero)
    if len(n) == 11 and n.startswith('20'):
        return 'empresa', n
    if len(n) == 11 and n[:2] in ('10', '15', '17'):
        return 'persona', n
    if len(n) == 8:
        return 'persona', n
    raise ValueError('Ingresa un RUC (11 dígitos) o DNI (8 dígitos) válido.')
