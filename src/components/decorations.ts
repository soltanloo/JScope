import { window, Range, DecorationOptions, TextEditorDecorationType } from 'vscode'

export type Decoration = { 
    decorationType: TextEditorDecorationType; 
    rangesOrOptions: Range[] | DecorationOptions[] 
}
export type Decorations = Decoration[] | undefined

let opacity = '44'
export const DECORATION_TYPES = {
    none: window.createTextEditorDecorationType({}),
    severity_0: window.createTextEditorDecorationType({
        backgroundColor: "#40a45b" + opacity,
        overviewRulerColor: "#40a45b" + opacity,
        // overviewRulerColor: "#FF0000",
        // opacity: "0.2",
        // fontWeight: "bold",
        // borderWidth: "0px 0px 1px 0px",
        // borderColor: "#E2E2E2",
        // borderStyle: "dashed",
        // textDecoration: "purple underline wavy",

    }),
    severity_1: window.createTextEditorDecorationType({
        backgroundColor: "#c2c44b" + opacity,
        overviewRulerColor: "#c2c44b" + opacity
    }),
    severity_2: window.createTextEditorDecorationType({
        backgroundColor: "#c47b4b" + opacity,
        overviewRulerColor: "#c47b4b" + opacity,
        // fontWeight: "bolder",
    }),
    severity_3: window.createTextEditorDecorationType({
        backgroundColor: "#c44b4b" + opacity,
        overviewRulerColor: "#c44b4b" + opacity
    }),
}