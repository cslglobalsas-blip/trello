export function sanitizeError(error: any): string {
  const errorMap: Record<string, string> = {
    '23505': 'Este registro ya existe',
    '23503': 'Referencia inválida',
    '23514': 'Valor no permitido',
    'PGRST116': 'No encontrado',
    'invalid_credentials': 'Credenciales inválidas',
    'user_already_exists': 'El usuario ya existe',
    'email_not_confirmed': 'Email no confirmado',
  };

  const code = error?.code || error?.message || '';

  for (const [key, message] of Object.entries(errorMap)) {
    if (code.includes(key)) {
      console.error('[ERROR]', error);
      return message;
    }
  }

  console.error('[ERROR]', error);
  return 'Ha ocurrido un error. Por favor intenta nuevamente.';
}
