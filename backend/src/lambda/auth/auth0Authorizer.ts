import { CustomAuthorizerEvent, CustomAuthorizerResult } from 'aws-lambda';
import 'source-map-support/register';
import { verify, decode} from 'jsonwebtoken';
import { createLogger } from '../../utils/logger';
import Axios from 'axios';
import { JwtPayload } from '../../auth/JwtPayload';
import * as util from 'util';
import {Jwt} from '../../auth/Jwt'
const logger = createLogger('auth');
const jwksUrl = 'https://dev-d7oyz4rj.us.auth0.com/.well-known/jwks.json';
export const handler = async (event: CustomAuthorizerEvent): Promise<CustomAuthorizerResult> => {
  logger.info('Authorizing a user', event.authorizationToken);
  try {
    const jwtToken = await verifyToken(event.authorizationToken);
    logger.info('User was authorized', jwtToken);
    return {
      principalId: jwtToken.sub,
      policyDocument: {
        Version: '2012-10-17',
        Statement: [
          {
            Action: 'execute-api:Invoke',
            Effect: 'Allow',
            Resource: '*'
          }
        ]
      }
    };
  } catch (e) {
    logger.error('User not authorized', { error: e.message });
    return {
      principalId: 'user',
      policyDocument: {
        Version: '2012-10-17',
        Statement: [
          {
            Action: 'execute-api:Invoke',
            Effect: 'Deny',
            Resource: '*'
          }
        ]
      }
    };
  }
}
async function verifyToken(authHeader: string): Promise<JwtPayload> {
  const token = getToken(authHeader)
  const response = await Axios.get(jwksUrl);
  const jwks = response.data;
  const keys:any[] = jwks.keys;
  logger.info("jwks - "+util.inspect(jwks, false, null, true));
  const jwt: Jwt = decode(token, { complete: true }) as Jwt
  const signingKeys = keys.filter(key => key.use === 'sig' 
      && key.kty === 'RSA' 
      && key.kid           
      && key.x5c && key.x5c.length 
    ).map(key => {
      return { kid: key.kid, nbf: key.nbf, x5c: key.x5c[0] };
    });
  const signingKey = signingKeys.find(key => key.kid === jwt.header.kid);
  let certValue:string = signingKey.x5c;
  
  certValue = certValue.match(/.{1,64}/g).join('\n');
  const finalCertKey:string = `-----BEGIN CERTIFICATE-----\n${certValue}\n-----END CERTIFICATE-----\n`;
  logger.info("finalCertKey - "+util.inspect(finalCertKey, false, null, true));
  let jwtPayload:JwtPayload = verify(token, finalCertKey, { algorithms: ['RS256'] }) as JwtPayload; 
  return jwtPayload;
}
function getToken(authHeader: string): string {
  if (!authHeader) throw new Error('No authentication header');
  if (!authHeader.toLowerCase().startsWith('bearer '))
    throw new Error('Invalid authentication header');
  const split = authHeader.split(' ');
  const token = split[1];
  return token;
}
