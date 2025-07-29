import * as crypto from 'crypto';

type UidPrefix = 'usr' | 'inv' | 'prj' | 'wrk' | 'tkn' | 'doc' | 'grp' | 'evt' | 'msg' | 'flw' | 'pln' | 'cmt';


export function generateUid(prefix: UidPrefix) {
  const randomPart = crypto.randomBytes(16).toString('hex').substring(0, 24);
  return `${prefix}_${randomPart}`;
}
