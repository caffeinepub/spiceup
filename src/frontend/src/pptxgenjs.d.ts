declare module "pptxgenjs" {
  class PptxGenJS {
    [key: string]: any;
    Slide: any;
    addSlide(): any;
    writeFile(opts: any): Promise<any>;
  }
  namespace PptxGenJS {
    type Slide = any;
  }
  export default PptxGenJS;
}
