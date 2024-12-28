import { isApiErrorResponse, NeynarAPIClient } from '@neynar/nodejs-sdk';
import { NEYNAR_API_KEY, SIGNER_UUID } from './config';


// Validating necessary environment variables or configurations.
if (!SIGNER_UUID) {
    throw new Error('SIGNER_UUID is not defined');
}
  
if (!NEYNAR_API_KEY) {
    throw new Error('NEYNAR_API_KEY is not defined');
}

const neynarClient = new NeynarAPIClient({ apiKey: NEYNAR_API_KEY });


/**
 * Function to publish a message (cast) using neynarClient.
 * @param msg - The message to be published.
 * @param parentCastHash - The hash of the parent cast.
 */
export const publishCast = async (msg: string, parentCastHash: string): Promise<string> => {
    try {
      console.log('publishing cast');
      // Use the neynarClient to publish the cast.
      const postCastResponse = await neynarClient.publishCast({
        signerUuid: SIGNER_UUID,
        text: msg,
        parent: parentCastHash,
      });
      console.log('Cast published successfully');
      return postCastResponse.cast.hash;
    } catch (err) {
      // Error handling, checking if it's an API response error.
      if (isApiErrorResponse(err)) {
        console.log(err.response.data);
      } else console.log(err);
      return '';
    }
};
  
export default neynarClient;
