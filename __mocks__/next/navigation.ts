export const redirect = (url: string) => {
  throw new Error(`REDIRECT:${url}`);
};
