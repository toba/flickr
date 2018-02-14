/**
 * Override environment variable retrieval so it just returns the key as the
 * value.
 */
global.process = process = {
   env: key => key
};
