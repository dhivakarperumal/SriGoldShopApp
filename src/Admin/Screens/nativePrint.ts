import { NativeModules } from 'react-native';

type NativePrintModule = {
  print: (options: { html: string; jobName: string }) => Promise<unknown>;
};

const nativePrint = NativeModules.RNPrint as NativePrintModule | undefined;

export async function printHtmlDocument(html: string, jobName: string) {
  if (!nativePrint || typeof nativePrint.print !== 'function') {
    throw new Error(
      'Printing is unavailable. Rebuild the app after installing native print support.',
    );
  }
  await nativePrint.print({ html, jobName });
}
