declare module "mammoth" {
  interface IdPath { path_id?: number }
  interface Path { path?: number[] }
  interface ConvertOptions {
    buffer?: Buffer;
    path?: string;
    includeDefaultStyleMap?: boolean;
    styleMap?: (string | [string, string])[];
    transformDocument?: (element: unknown) => unknown;
  }
  interface RawResult { value: unknown; messages: Array<{ type: string; message: string }> }
  interface Result { value: string; messages: Array<{ type: string; message: string }> }
  function extractRawText(input: ConvertOptions): Promise<Result>;
  function convertToHtml(input: ConvertOptions): Promise<Result>;
  function convertToMarkdown(input: ConvertOptions): Promise<Result>;
}