import { v4 as uuidv4 } from 'uuid'
import bcrypt from 'bcryptjs'

export function generateSessionId(): string {
  return uuidv4()
}

export async function hashPasscode(passcode: string): Promise<string> {
  return bcrypt.hash(passcode, 10)
}

export async function verifyPasscode(passcode: string, hash: string): Promise<boolean> {
  return bcrypt.compare(passcode, hash)
}
