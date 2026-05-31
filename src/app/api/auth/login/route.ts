export async function POST() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL
  // const apiUrl = 'http://127.0.0.1:3000/api/v1'
  const email = process.env.AUTH_EMAIL
  const password = process.env.AUTH_PASSWORD

  if (!apiUrl || !email || !password) {
    return Response.json({ error: 'Server misconfigured: missing AUTH_EMAIL, AUTH_PASSWORD, or NEXT_PUBLIC_API_URL' }, { status: 500 })
  }

  const res = await fetch(`${apiUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })

  if (!res.ok) {
    return Response.json({ error: `Login failed (${res.status})` }, { status: res.status })
  }

  const data = (await res.json()) as { token: string }
  return Response.json({ token: data.token })
}
