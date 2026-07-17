const GRAPHQL_URL = process.env.NEXT_PUBLIC_GRAPHQL_URL || 'http://localhost:4001';

export async function graphqlRequest(query, variables = {}, token = null) {
  const headers = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(GRAPHQL_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify({ query, variables }),
    });

    const data = await response.json();

    if (data.errors) {
      const errorMessage = data.errors.map(e => e.message).join(', ');
      throw new Error(errorMessage);
    }

    return data.data;
  } catch (error) {
    console.error('GraphQL Error:', error);
    throw error;
  }
}
