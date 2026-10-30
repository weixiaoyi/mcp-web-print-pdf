import assert from "node:assert/strict";
import test from "node:test";
import { buildOptions } from "../src/options.js";

test("defaults to print", () => {
    const { action, extraOptions } = buildOptions({});
    assert.equal(action, "print");
    assert.equal(extraOptions.action, "print");
});

test("dry_run: true previews", () => {
    assert.equal(buildOptions({ dry_run: true }).action, "preview");
});

test("dry_run: false prints", () => {
    assert.equal(buildOptions({ dry_run: false }).action, "print");
});

test("explicit extra_options.action wins", () => {
    assert.equal(buildOptions({ dry_run: true, extra_options: { action: "print" } }).action, "print");
    assert.equal(buildOptions({ dry_run: false, extra_options: { action: "preview" } }).action, "preview");
});

test("standard paper goes to both option objects", () => {
    const { pdfOptions, printOptions } = buildOptions({ paper_format: "A4" });
    assert.equal(pdfOptions.paperFormat, "A4");
    assert.equal(printOptions.paperFormat, "A4");
});

test("custom paper only goes to printOptions", () => {
    const { pdfOptions, printOptions } = buildOptions({ paper_format: "80mm" });
    assert.equal(printOptions.paperFormat, "80mm");
    assert.equal(pdfOptions.paperFormat, undefined);
});

test("explicit option objects win over convenience args", () => {
    const { printOptions, pdfOptions } = buildOptions({
        paper_format: "A4",
        printer_name: "A",
        copies: 2,
        print_options: { printerName: "B", copies: 3 },
        pdf_options: { paperFormat: "A5" },
    });
    assert.equal(printOptions.printerName, "B");
    assert.equal(printOptions.copies, 3);
    assert.equal(pdfOptions.paperFormat, "A5");
});
