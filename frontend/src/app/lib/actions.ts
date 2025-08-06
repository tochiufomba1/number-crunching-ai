'use server';
import { signIn } from '../../../auth';
import { AuthError } from 'next-auth';
import { registerHelper } from './helpers'
import { coaSchema } from './definitions';
import { auth } from '@/../auth'

export async function authenticate(
  prevState: string | undefined,
  formData: FormData,
) {
  try {
    await signIn('credentials', formData);
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case 'CredentialsSignin':
          return 'Invalid credentials.';
        default:
          return 'Something went wrong.';
      }
    }
    throw error;
  }
}

export async function register(
  prevState: string | undefined,
  formData: FormData,
) {
  const result = await registerHelper(formData);
  if (!result?.success) {
    return result?.message
  }

  return '/login'

  //redirect('/login')
}


type AddCOAResult =
  | { errors: Record<string, string[]> }     // validation errors
  | { submissionError: string }              // external‐API error
  | { success: boolean }
export async function addCOA(
  prevState: AddCOAResult | undefined,
  formData: FormData,
) {
  console.log('[addCOA] module loaded, BASE_URL=%s', process.env.EXTERNAL_API_BASE_URL);
  console.log('[addCOA] invoked');
  const validationResult = coaSchema.safeParse({
    name: formData.get('name'),
    file: formData.get('coa')
  })

  if (!validationResult.success) {
    console.log('here')
    return {
      errors: validationResult.error.flatten().fieldErrors
    }
  }

  console.log('1')
  const session = await auth()

  if (!session) {
    return {
      submissionError: 'Please sign in',
    }
  }
  console.log('1 end')

  try {
    //fetch here
    console.log('2')
    const res = await fetch(`${process.env.EXTERNAL_API_BASE_URL}/api/users/coa`,
      {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${session.user.token}`, 'Accept': 'application/json' },
        body: formData
      }
    )


    if (!res.ok) {
      return {
        submissionError: 'Upload failed on the server',
      }
    }

    console.log('2 end')

    return { success: true }
  } catch (e: unknown) {
    console.error((e as Error).message)
    return {
      submissionError: 'Upload failed on the server',
    }
  }
}

export async function submitNewVendor(
  prevState: string | undefined,
  formData: FormData,
) {
  try {
    const response = await fetch(`https://localhost:5000/api/users`, {
      method: 'POST',
      credentials: 'include',
      body: formData,
    });

    const res = await response.json()

    if (!response.ok)
      return res["message"]
  } catch (error) {
    throw error;
  }
}