import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import ts from 'typescript';

const navbar = ts.createSourceFile(
    'Navbar.tsx',
    readFileSync(new URL('../src/components/layout/Navbar.tsx', import.meta.url), 'utf8'),
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX
);
const pos = ts.createSourceFile(
    'POSView.tsx',
    readFileSync(new URL('../src/features/pos/POSView.tsx', import.meta.url), 'utf8'),
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX
);
const cart = ts.createSourceFile(
    'CartSidebar.tsx',
    readFileSync(new URL('../src/features/pos/components/CartSidebar.tsx', import.meta.url), 'utf8'),
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX
);

function elements(source, tag) {
    const matches = [];

    function visit(node) {
        if ((ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node)) &&
            (node.tagName ?? node.openingElement.tagName).getText(source) === tag) {
            matches.push(node);
        }
        ts.forEachChild(node, visit);
    }

    visit(source);
    return matches;
}

function attribute(element, name) {
    const opening = element.openingElement ?? element;
    const value = opening.attributes.properties.find((property) => property.name?.getText() === name)?.initializer;
    return value && ts.isStringLiteral(value) ? value.text : undefined;
}

function classes(element) {
    return new Set((attribute(element, 'className') ?? '').split(/\s+/));
}

test('header reserves a separate row for desktop navigation until it fits alongside controls', () => {
    const header = elements(navbar, 'header')[0];
    const desktop = elements(navbar, 'nav').find((element) => attribute(element, 'aria-label') === 'Desktop navigation');
    const status = elements(navbar, 'div').find((element) => classes(element).has('justify-self-end'));

    assert.ok(header && desktop && status);
    assert.ok(classes(header).has('lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]'));
    assert.ok(classes(desktop).has('md:col-span-2'));
    assert.ok(classes(desktop).has('lg:col-start-2'));
    assert.ok(classes(status).has('col-start-2'));
    assert.ok(classes(status).has('row-start-1'));
});

test('mobile dock and desktop pills have opposite display breakpoints', () => {
    const desktop = elements(navbar, 'nav').find((element) => attribute(element, 'aria-label') === 'Desktop navigation');
    const mobile = elements(navbar, 'nav').find((element) => attribute(element, 'aria-label') === 'Mobile navigation');

    assert.ok(desktop && mobile);
    assert.ok(classes(desktop).has('hidden'));
    assert.ok(classes(desktop).has('md:flex'));
    assert.ok(classes(mobile).has('md:hidden'));
    assert.ok(classes(mobile).has('fixed'));
    assert.ok(classes(mobile).has('bottom-0'));
    assert.ok(!classes(mobile).has('md:flex'));
});

test('POS cash out has one label and the mobile dock has clearance', () => {
    const wrapper = elements(pos, 'div').find((element) => classes(element).has('min-h-screen'));
    const labels = elements(pos, 'span').filter((element) => element.children.some((child) => child.getText(pos) === 'Quick Cash Out' || child.getText(pos) === 'Cash Out'));

    assert.ok(wrapper);
    assert.ok(classes(wrapper).has('pb-20'));
    assert.ok(classes(wrapper).has('md:pb-0'));
    assert.equal(labels.length, 1);
    assert.equal(labels[0].children[0].getText(pos), 'Quick Cash Out');
});

test('mobile ticket hides items until View Ticket opens the drawer, retaining the desktop item list', () => {
    const sidebar = elements(cart, 'aside')[0];
    const expand = elements(cart, 'button').find((element) => attribute(element, 'aria-label') === 'Expand ticket');
    const itemList = elements(cart, 'div').find((element) => element.openingElement?.getText(cart).includes('min-h-0 flex-1 overflow-y-auto'));

    assert.ok(sidebar && expand && itemList);
    assert.match(sidebar.getText(cart), /lg:flex/);
    assert.match(sidebar.getText(cart), /fixed bottom-/);
    assert.doesNotMatch(sidebar.getText(cart), /'hidden lg:flex'/);
    assert.match(itemList.getText(cart), /breakdown\.items\.map/);
    assert.match(itemList.openingElement.getText(cart), /isOpenOnMobile\s*\?\s*''\s*:\s*'hidden lg:block'/);
    assert.doesNotMatch(sidebar.openingElement.getText(cart), /h-60/);
    assert.match(expand.getText(cart), /onOpenMobile/);
    assert.match(sidebar.getText(cart), /md:bottom-4/);
});

test('cashier unlock sits lower than the other top-row header content', () => {
    const unlock = elements(navbar, 'button').find((element) => element.getText(navbar).includes('Shift Cashier'));

    assert.ok(unlock);
    assert.ok(classes(unlock).has('mt-4'));
});