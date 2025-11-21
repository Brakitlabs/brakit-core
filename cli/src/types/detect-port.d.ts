declare module "detect-port" {
  function detect(port: number): Promise<number>;
  export default detect;
}
