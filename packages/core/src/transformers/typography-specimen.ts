import type { IR, TypographyContract, TypographyContractRecipe } from '../generator/types.js';

export interface TypographySpecimenConfig {
	title?: string;
	/** Optional generated @font-face CSS. Kept separate from the pure font manifest. */
	fontFaceCss?: string;
	/** Optional stylesheet link; preferred when font URLs are relative to an existing CSS file. */
	fontFaceHref?: string;
	lang?: string;
	/** Calibration controls are enabled by default. */
	interactive?: boolean;
	/** Private, generated role fallback families that can be forced for browser verification. */
	adjustedFallbackFamilies?: Record<string, string>;
}

const specimenText = {
	short: 'Sphinx of black quartz, judge my vow.',
	long: 'Typography should remain coherent in dense controls, ordinary interface copy, and longer passages without making every callsite choose unrelated values.',
	glyphs:
		'ABCDEFGHIJKLMNOPQRSTUVWXYZ · abcdefghijklmnopqrstuvwxyz · 0123456789 · $€£¥ ₿ ± × ÷ → ← ↑ ↓ { } [ ] ( )',
};

function escapeHtml(value: string): string {
	return value
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#039;');
}

function escapeStyle(value: string): string {
	return value.replace(/<\/style/gi, '<\\/style');
}

function serializeScriptData(value: unknown): string {
	return JSON.stringify(value).replace(/</g, '\\u003c');
}

function variable(token: string): string {
	return `var(--${token})`;
}

function typographyTokenCss(ir: IR): string {
	const declarations = Object.values(ir.tokens)
		.filter((token) => token.family === 'typography')
		.map((token) => `  --${token.name}: ${token.value};`);
	return `:root {\n${declarations.join('\n')}\n}`;
}

function recipeDeclarations(
	role: TypographyContract['roles'][string],
	recipe: TypographyContractRecipe
) {
	return [
		`  font-family: ${variable(role.fontFamilyToken)};`,
		`  font-size: ${variable(recipe.fontSizeToken)};`,
		`  font-weight: ${variable(recipe.fontWeightToken)};`,
		`  font-style: ${variable(role.fontStyleToken)};`,
		`  font-synthesis: none;`,
		`  line-height: ${variable(recipe.lineHeightToken)};`,
		`  letter-spacing: ${variable(recipe.letterSpacingToken)};`,
		...(recipe.fontKerningToken ? [`  font-kerning: ${variable(recipe.fontKerningToken)};`] : []),
		...(recipe.fontOpticalSizingToken
			? [`  font-optical-sizing: ${variable(recipe.fontOpticalSizingToken)};`]
			: []),
		...(recipe.fontFeatureSettingsToken
			? [`  font-feature-settings: ${variable(recipe.fontFeatureSettingsToken)};`]
			: []),
		...(recipe.fontVariationSettingsToken
			? [`  font-variation-settings: ${variable(recipe.fontVariationSettingsToken)};`]
			: []),
	].join('\n');
}

function roleCss(contract: TypographyContract): string {
	return Object.entries(contract.roles)
		.flatMap(([roleName, role]) => [
			`[data-type-role=${JSON.stringify(roleName)}]:not([data-type-variant]) {\n${recipeDeclarations(role, role.base)}\n}`,
			...Object.entries(role.variants).map(
				([variantName, recipe]) =>
					`[data-type-role=${JSON.stringify(roleName)}][data-type-variant=${JSON.stringify(variantName)}] {\n${recipeDeclarations(role, recipe)}\n}`
			),
		])
		.join('\n\n');
}

function adjustedFallbackCss(
	contract: TypographyContract,
	families: Record<string, string> | undefined
): string {
	if (!families) return '';
	return Object.entries(families)
		.filter(([roleName]) => Boolean(contract.roles[roleName]))
		.map(([roleName, family]) => {
			const role = contract.roles[roleName];
			const font = contract.fonts[role.font];
			const remaining = (font?.fallbacks ?? []).filter((fallback) => fallback !== family);
			return `body[data-fallback=true] [data-type-role=${JSON.stringify(roleName)}] { font-family: ${[family, ...remaining].map((value) => JSON.stringify(value)).join(', ')} !important; }`;
		})
		.join('\n');
}

function fontStack(values: string[]): string {
	return values.map((value) => JSON.stringify(value)).join(', ');
}

function fallbackComparisonStacks(
	contract: TypographyContract,
	families: Record<string, string> | undefined
): { primary: Record<string, string>; adjusted: Record<string, string> } {
	const primary: Record<string, string> = {};
	const adjusted: Record<string, string> = {};
	for (const [roleName, fallbackFamily] of Object.entries(families ?? {})) {
		const role = contract.roles[roleName];
		if (!role) continue;
		const font = contract.fonts[role.font];
		if (!font) continue;
		const remaining = font.fallbacks.filter((fallback) => fallback !== fallbackFamily);
		primary[roleName] = fontStack([font.family, ...font.fallbacks]);
		adjusted[roleName] = fontStack([fallbackFamily, ...remaining]);
	}
	return { primary, adjusted };
}

function fallbackDiagnostic(key: string, label: string): string {
	return `<output class="fallback-diagnostic" data-fallback-diagnostic="${escapeHtml(key)}" aria-live="polite"><strong>${escapeHtml(label)}</strong><span>measuring primary → adjusted fallback…</span></output>`;
}

function atomicFontSizePrefix(selected: string | number, atomicToken: string): string {
	const selectedSuffix = `-${String(selected)}`;
	return atomicToken.endsWith(selectedSuffix) ? atomicToken.slice(0, -selectedSuffix.length) : 'fs';
}

function fontSizeOptions(ir: IR, selected: string | number, atomicToken: string): string {
	const prefix = atomicFontSizePrefix(selected, atomicToken);
	const names = Object.values(ir.tokens)
		.filter(
			(token) =>
				token.family === 'typography' &&
				token.name.startsWith(`${prefix}-`) &&
				/^(?:min|\d+)$/.test(token.name.slice(prefix.length + 1))
		)
		.map((token) => token.name.slice(prefix.length + 1));
	return names
		.map(
			(name) =>
				`<option value="${escapeHtml(name)}"${String(selected) === name ? ' selected' : ''}>--${escapeHtml(prefix)}-${escapeHtml(name)}</option>`
		)
		.join('');
}

function calibrationControls(
	ir: IR,
	roleName: string,
	variantName: string | undefined,
	recipe: TypographyContractRecipe,
	role: TypographyContract['roles'][string],
	interactive: boolean
): string {
	if (!interactive) return '';
	const weightOptions = role.styles[role.defaultStyle]!.weights.map(
		(alias) =>
			`<option value="${escapeHtml(alias)}"${recipe.weight === alias ? ' selected' : ''}>${escapeHtml(alias)} · ${role.weights[alias]}</option>`
	).join('');
	const weightPrefix = role.weightTokens[recipe.weight].slice(0, -recipe.weight.length);
	return `<div class="calibration" data-role="${escapeHtml(roleName)}" data-variant="${escapeHtml(variantName ?? '')}" data-atomic-prefix="${escapeHtml(atomicFontSizePrefix(recipe.fontSizeReference, recipe.atomicFontSizeToken))}" data-weight-prefix="${escapeHtml(weightPrefix)}" data-baseline='${escapeHtml(JSON.stringify({ fontSize: recipe.fontSizeReference, weight: recipe.weight, lineHeight: recipe.lineHeight, letterSpacing: recipe.letterSpacingEm }))}'>
  <label>size<select data-control="fontSize">${fontSizeOptions(ir, recipe.fontSizeReference, recipe.atomicFontSizeToken)}</select></label>
  <label>weight<select data-control="weight">${weightOptions}</select></label>
  <label>line height<input data-control="lineHeight" type="range" min="0.7" max="2" step="0.01" value="${recipe.lineHeight}"><output>${recipe.lineHeight}</output></label>
  <label>letter spacing<input data-control="letterSpacing" type="range" min="-0.1" max="0.2" step="0.001" value="${recipe.letterSpacingEm}"><output>${recipe.letterSpacingEm}em</output></label>
  <button class="reset-recipe" type="button">Reset recipe</button>
</div>`;
}

function roleCards(
	ir: IR,
	contract: TypographyContract,
	interactive: boolean,
	fallbackRoles: Set<string>
): string {
	return Object.entries(contract.roles)
		.map(([roleName, role]) => {
			const family = contract.fonts[role.font];
			const recipes: Array<[string | undefined, TypographyContractRecipe]> = role.displayOrder.map(
				(name) => (name === 'base' ? [undefined, role.base] : [name, role.variants[name]])
			);
			const rows = recipes
				.map(([variantName, recipe]) => {
					const label = variantName ?? 'base';
					const fallbackKey = `${roleName}::recipe::${label}`;
					return `<article class="sample-row">
  <div class="sample-meta">
    <strong>${escapeHtml(label)}</strong>
    <code>--${escapeHtml(recipe.atomicFontSizeToken)}</code>
	<code>weight ${escapeHtml(recipe.weight)} · ${role.weights[recipe.weight]}</code>
    <code>lh ${recipe.lineHeight}</code>
    <code>ls ${recipe.letterSpacingEm}em</code>
	${fallbackRoles.has(roleName) ? fallbackDiagnostic(fallbackKey, 'fallback delta') : ''}
  </div>
  <div class="sample-preview" data-type-role="${escapeHtml(roleName)}"${variantName ? ` data-type-variant="${escapeHtml(variantName)}"` : ''}>
    <div class="sample-copy" contenteditable="true" spellcheck="false" data-type-role="${escapeHtml(roleName)}"${variantName ? ` data-type-variant="${escapeHtml(variantName)}"` : ''}${fallbackRoles.has(roleName) ? ` data-fallback-measure="${escapeHtml(fallbackKey)}"` : ''}>${escapeHtml(specimenText.short)}</div>
    <div class="metric-overlay" aria-hidden="true"></div>
    <div class="metric-probe" aria-hidden="true">Hhx<span class="baseline-probe"></span><i class="cap-probe"></i><i class="ex-probe"></i></div>
  </div>
  ${calibrationControls(ir, roleName, variantName, recipe, role, interactive)}
</article>`;
				})
				.join('\n');
			return `<section class="role-card" id="role-${escapeHtml(roleName)}">
  <header class="role-header">
    <div><span class="eyebrow">role</span><h2>${escapeHtml(roleName)}</h2></div>
    <div class="role-defaults"><code>${escapeHtml(family?.family ?? role.font)}</code><code>${family?.verified ? 'verified font faces' : 'unverified external stack'}</code><code>base weight ${escapeHtml(role.base.weight)} (${role.weights[role.base.weight]})</code></div>
  </header>
  ${rows}
</section>`;
		})
		.join('\n');
}

function weightCards(contract: TypographyContract): string {
	return Object.entries(contract.roles)
		.flatMap(([roleName, role]) =>
			Object.entries(role.styles).map(([style, capability]) => {
				const weights = capability!.weights
					.map(
						(
							alias
						) => `<div class="weight-sample" data-type-role="${escapeHtml(roleName)}" style="font-style:${escapeHtml(style)};font-weight:${variable(role.weightTokens[alias])}">
  <code>${escapeHtml(alias)} · ${role.weights[alias]}</code><span>Aa 0123</span>
</div>`
					)
					.join('\n');
				return `<article class="weight-card"><h3>${escapeHtml(roleName)} / ${escapeHtml(style)}</h3><div class="weight-grid">${weights}</div></article>`;
			})
		)
		.join('\n');
}

function stressCards(contract: TypographyContract, fallbackRoles: Set<string>): string {
	return Object.keys(contract.roles)
		.map((roleName) => {
			const measure = (name: string) =>
				fallbackRoles.has(roleName)
					? ` data-fallback-measure="${escapeHtml(`${roleName}::stress::${name}`)}"`
					: '';
			const diagnostic = (name: string, label: string) =>
				fallbackRoles.has(roleName)
					? fallbackDiagnostic(`${roleName}::stress::${name}`, label)
					: '';
			return `<article class="stress-card">
  <div class="sample-meta"><strong>${escapeHtml(roleName)}</strong><code>base recipe</code></div>
  <p class="wrap-s" data-type-role="${escapeHtml(roleName)}"${measure('narrow')}>${escapeHtml(specimenText.long)}</p>
  ${diagnostic('narrow', 'narrow wrap')}
  <p class="wrap-l" data-type-role="${escapeHtml(roleName)}"${measure('wide')}>${escapeHtml(specimenText.long)}</p>
  ${diagnostic('wide', 'wide wrap')}
  <div class="glyphs" data-type-role="${escapeHtml(roleName)}"${measure('glyphs')}>${escapeHtml(specimenText.glyphs)}</div>
  ${diagnostic('glyphs', 'glyph stress')}
</article>`;
		})
		.join('\n');
}

/** Generate a standalone, framework-neutral visual calibration document. */
export function toTypographySpecimen(ir: IR, config: TypographySpecimenConfig = {}): string {
	if (!ir.typography || Object.keys(ir.typography.roles).length === 0) {
		throw new Error('A typography system with semantic roles is required for specimen output.');
	}
	const title = config.title ?? 'TFS typography specimen';
	const lang = config.lang ?? 'en';
	const interactive = config.interactive ?? true;
	const hasFontAssets = Boolean(config.fontFaceCss || config.fontFaceHref);
	const fontNotice = hasFontAssets
		? 'Font assets are connected. Confirm every face reports loaded before accepting calibration.'
		: 'No @font-face CSS was supplied; this document cannot verify which prepared or external faces the browser rendered.';
	const fontLink = config.fontFaceHref
		? `<link id="tfs-font-assets" rel="stylesheet" href="${escapeHtml(config.fontFaceHref)}">`
		: '';
	const fontFamilies = [
		...new Set(
			Object.values(ir.typography.roles).map(
				(role) => ir.typography!.fonts[role.font]?.family ?? role.font
			)
		),
	];
	const preparedWarnings = Object.entries(ir.typography.fonts).flatMap(([fontName, font]) =>
		font.warnings.map((warning) => `${fontName}: ${warning}`)
	);
	const fallbackStacks = fallbackComparisonStacks(ir.typography, config.adjustedFallbackFamilies);
	const fallbackRoles = new Set(Object.keys(fallbackStacks.adjusted));
	const fallbackNotice = fallbackRoles.size
		? '<div class="notice fallback-notice"><strong>Measured fallback comparison</strong><span>Primary → adjusted fallback deltas below are browser measurements at this viewport. Non-zero values are residual reflow—not a pass/fail score or approval state.</span></div>'
		: '';
	const warningPanel = preparedWarnings.length
		? `<div class="notice"><strong>Prepared font warnings</strong><ul>${preparedWarnings.map((warning) => `<li>${escapeHtml(warning)}</li>`).join('')}</ul></div>`
		: '';
	return `<!doctype html>
<html lang="${escapeHtml(lang)}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
${fontLink}
<style>
${escapeStyle(config.fontFaceCss ?? '')}
${escapeStyle(typographyTokenCss(ir))}
${roleCss(ir.typography)}
${adjustedFallbackCss(ir.typography, config.adjustedFallbackFamilies)}
*{box-sizing:border-box}html{color-scheme:dark;background:#111}body{margin:0;background:#111;color:#f4f4f0;font-family:system-ui,sans-serif}main{width:min(1180px,calc(100% - 32px));margin:auto;padding:48px 0 96px}.page-header{display:grid;gap:12px;margin-bottom:32px}.page-header h1,.role-header h2,.weight-card h3{margin:0}.page-header p{max-width:76ch;margin:0;color:#aaa}.notice{display:flex;gap:8px;padding:12px 16px;border:1px solid #3c3c38;background:#191917}.notice:not(.fallback-notice){display:block}.fallback-notice{margin:16px 0;color:#bbb}.fallback-notice strong{color:#f4f4f0;white-space:nowrap}.tools{position:sticky;z-index:3;top:8px;display:flex;flex-wrap:wrap;gap:14px;width:fit-content;margin:0 0 24px auto;padding:10px 12px;border:1px solid #3c3c38;background:rgb(17 17 17/.94);font:500 12px/1.2 ui-monospace,monospace}.tools label{display:flex;align-items:center;gap:6px}.metric-legend{display:none;gap:10px;width:100%;color:#aaa}.metric-legend i{font-style:normal}.metric-legend i::before{display:inline-block;width:16px;margin-right:5px;border-top:1px solid;content:""}.metric-legend .cap::before{color:#ff4f9a}.metric-legend .ex::before{color:#52b7ff}.metric-legend .baseline::before{color:#ffd166}body[data-lines=true] .metric-legend{display:flex}.section-title{margin:48px 0 16px;font:700 12px/1 ui-monospace,monospace;letter-spacing:.08em;text-transform:uppercase;color:#aaa}.role-card,.weight-card,.stress-card{border:1px solid #30302d;background:#181816}.role-card+.role-card,.weight-card+.weight-card,.stress-card+.stress-card{margin-top:16px}.role-header{display:flex;align-items:end;justify-content:space-between;gap:16px;padding:18px 20px;border-bottom:1px solid #30302d}.eyebrow{display:block;margin-bottom:4px;font:500 10px/1 ui-monospace,monospace;letter-spacing:.1em;text-transform:uppercase;color:#888}.role-defaults,.sample-meta{display:flex;flex-wrap:wrap;align-items:center;gap:8px}code{font:500 11px/1.2 ui-monospace,monospace;color:#aaa}.fallback-diagnostic{display:flex;flex-basis:100%;gap:7px;color:#aaa;font:500 10px/1.35 ui-monospace,monospace}.fallback-diagnostic strong{color:#d4bfff;text-transform:uppercase}.fallback-diagnostic[data-residual=true] span{color:#f0c779}.sample-row{display:grid;grid-template-columns:220px minmax(220px,1fr) minmax(300px,1fr);gap:20px;align-items:center;padding:20px}.sample-row+.sample-row{border-top:1px solid #282826}.sample-preview{position:relative;min-width:0;padding:8px;border-radius:3px}.sample-copy{position:relative;z-index:1;min-width:0;outline:none}.sample-preview:focus-within{box-shadow:0 0 0 1px #a98cff}.metric-probe{position:fixed;left:-10000px;top:0;display:inline-block;visibility:hidden;white-space:nowrap}.baseline-probe{display:inline-block;width:0;height:0;vertical-align:baseline}.cap-probe,.ex-probe{position:absolute;display:block;width:0}.cap-probe{height:1cap}.ex-probe{height:1ex}.metric-overlay{display:none;position:absolute;z-index:2;inset:8px;pointer-events:none}.metric-guide{position:absolute;right:0;left:0;border-top:1px solid}.metric-guide i{position:absolute;right:2px;bottom:2px;padding:1px 3px;background:rgb(17 17 17/.86);font:500 8px/1 ui-monospace,monospace;font-style:normal;text-transform:uppercase}.metric-line{color:rgb(255 255 255/.28)}.metric-cap{color:#ff4f9a}.metric-ex{color:#52b7ff}.metric-baseline{color:#ffd166}body[data-lines=true] .sample-preview{outline:1px solid rgb(255 255 255/.28)}body[data-lines=true] .metric-overlay{display:block}.sample-meta strong{font:700 12px/1 ui-monospace,monospace;text-transform:uppercase}.calibration{display:grid;gap:8px;padding:12px;border:1px solid #30302d;background:#131311}.calibration label{display:grid;grid-template-columns:100px 1fr 64px;gap:8px;align-items:center;font:500 11px/1.2 ui-monospace,monospace}.calibration select,.calibration input{width:100%}.calibration.changed{border-color:#a98cff}.reset-recipe{justify-self:end;padding:4px 7px;border:1px solid #555;background:#222;color:inherit;font:500 10px/1 ui-monospace,monospace;cursor:pointer}.weight-card,.stress-card{padding:20px}.weight-card h3{margin-bottom:16px}.weight-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:1px;background:#30302d;border:1px solid #30302d}.weight-sample{display:grid;gap:12px;padding:16px;background:#181816}.weight-sample span{font-size:24px;line-height:1}.stress-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}.stress-card{margin:0!important}.stress-card p{margin:18px 0}.stress-card>.fallback-diagnostic{margin:-10px 0 14px}.wrap-s{width:18rem;max-width:100%}.wrap-l{width:32rem;max-width:100%}.glyphs{overflow-wrap:anywhere;padding-top:16px;border-top:1px solid #30302d}pre{overflow:auto;max-height:340px;padding:16px;border:1px solid #30302d;background:#0c0c0b;color:#d8d8cf;font:12px/1.5 ui-monospace,monospace}.copy-button{padding:8px 12px;border:1px solid #555;background:#222;color:inherit;cursor:pointer}body[data-theme=light]{background:#f5f5f0;color:#171714}body[data-theme=light] .role-card,body[data-theme=light] .weight-card,body[data-theme=light] .stress-card,body[data-theme=light] .notice{background:#fff;border-color:#d8d8d0}body[data-wcag=true] [data-type-role]{line-height:1.5!important;letter-spacing:.12em!important;word-spacing:.16em!important}@media(max-width:850px){main{width:min(100% - 20px,1180px);padding-top:28px}.sample-row{grid-template-columns:1fr}.stress-grid{grid-template-columns:1fr}.role-header{align-items:start;flex-direction:column}}
</style>
</head>
<body>
<main>
  <header class="page-header"><span class="eyebrow">three-forma-styli</span><h1>${escapeHtml(title)}</h1><p>Inspect every configured role, base recipe, variant, style and weight. Calibration controls create an in-memory draft only; project configuration remains the source of truth.</p><div class="notice">${escapeHtml(fontNotice)}</div>${warningPanel}</header>
  <div class="tools"><label><input id="toggle-lines" type="checkbox">metric diagnostics</label><label><input id="toggle-theme" type="checkbox">light surface</label><label><input id="toggle-wcag" type="checkbox">WCAG spacing stress</label>${fallbackRoles.size ? '<label><input id="toggle-fallback" type="checkbox">force adjusted fallback</label>' : ''}${config.fontFaceHref ? '<label><input id="toggle-fonts" type="checkbox">disable all generated font faces</label>' : ''}<span id="font-status">checking fonts</span><span class="metric-legend"><i class="cap">CSS 1cap</i><i class="ex">CSS 1ex</i><i class="baseline">rendered baseline</i><span>grey = line box</span></span></div>
  <h2 class="section-title">Role recipes</h2>${roleCards(ir, ir.typography, interactive, fallbackRoles)}
  <h2 class="section-title">Style and weight combinations</h2>${weightCards(ir.typography)}
  <h2 class="section-title">Wrapping and glyph stress</h2>${fallbackNotice}<div class="stress-grid">${stressCards(ir.typography, fallbackRoles)}</div>
  ${interactive ? '<h2 class="section-title">Draft configuration patch</h2><button class="copy-button" id="copy-patch" type="button">Copy patch</button><pre id="draft-patch">No calibration changes.</pre>' : ''}
</main>
<script>
const families=${serializeScriptData(fontFamilies)};
const primaryFamilyStacks=${serializeScriptData(fallbackStacks.primary)};
const adjustedFamilyStacks=${serializeScriptData(fallbackStacks.adjusted)};
const drafts={};
function appendMetricGuide(overlay,name,top,label){if(!Number.isFinite(top))return;const guide=document.createElement('span');guide.className='metric-guide metric-'+name;guide.style.top=top+'px';const text=document.createElement('i');text.textContent=label;guide.append(text);overlay.append(guide)}
function refreshMetrics(){document.querySelectorAll('.sample-preview').forEach(sample=>{const overlay=sample.querySelector('.metric-overlay');const probe=sample.querySelector('.metric-probe');const baselineProbe=sample.querySelector('.baseline-probe');if(!overlay||!probe||!baselineProbe)return;overlay.replaceChildren();const probeRect=probe.getBoundingClientRect();const baseline=baselineProbe.getBoundingClientRect().top-probeRect.top;appendMetricGuide(overlay,'line',0,'line top');appendMetricGuide(overlay,'line',probeRect.height,'line bottom');if(CSS.supports('height','1cap')){const cap=sample.querySelector('.cap-probe')?.getBoundingClientRect().height;appendMetricGuide(overlay,'cap',baseline-cap,'1cap')}if(CSS.supports('height','1ex')){const ex=sample.querySelector('.ex-probe')?.getBoundingClientRect().height;appendMetricGuide(overlay,'ex',baseline-ex,'1ex')}appendMetricGuide(overlay,'baseline',baseline,'baseline')})}
const lineToggle=document.querySelector('#toggle-lines');lineToggle?.addEventListener('change',()=>{document.body.dataset.lines=String(lineToggle.checked);if(lineToggle.checked)refreshMetrics()});
const themeToggle=document.querySelector('#toggle-theme');themeToggle?.addEventListener('change',()=>document.body.dataset.theme=themeToggle.checked?'light':'dark');
const wcagToggle=document.querySelector('#toggle-wcag');wcagToggle?.addEventListener('change',()=>{document.body.dataset.wcag=String(wcagToggle.checked);scheduleFallbackDiagnostics()});
const fontToggle=document.querySelector('#toggle-fonts');const fallbackToggle=document.querySelector('#toggle-fallback');const fontLink=document.querySelector('#tfs-font-assets');fallbackToggle?.addEventListener('change',()=>{if(fallbackToggle.checked&&fontToggle?.checked){fontToggle.checked=false;if(fontLink)fontLink.disabled=false}document.body.dataset.fallback=String(fallbackToggle.checked);requestAnimationFrame(()=>{refreshFontStatus();refreshMetrics();scheduleFallbackDiagnostics()})});fontToggle?.addEventListener('change',()=>{if(fontToggle.checked&&fallbackToggle?.checked){fallbackToggle.checked=false;document.body.dataset.fallback='false'}if(fontLink)fontLink.disabled=fontToggle.checked;requestAnimationFrame(()=>{refreshFontStatus();refreshMetrics();scheduleFallbackDiagnostics()})});
function refreshFontStatus(){const faces=Array.from(document.fonts);const text=families.map(family=>{const matching=faces.filter(face=>face.family.replaceAll('"','')===family);if(!matching.length)return family+': not declared';return family+': '+matching.map(face=>face.style+' '+face.weight+' '+face.status).join(', ')}).join(' · ');const target=document.querySelector('#font-status');if(target)target.textContent=text}
function renderedLineCount(element){const range=document.createRange();range.selectNodeContents(element);const tops=[];for(const rect of range.getClientRects()){if(rect.width===0&&rect.height===0)continue;if(!tops.some(top=>Math.abs(top-rect.top)<0.5))tops.push(rect.top)}return tops.length||((element.textContent||'').length?1:0)}
const fallbackProbeProperties=['fontFamily','fontSize','fontWeight','fontStyle','fontStretch','fontKerning','fontFeatureSettings','fontVariationSettings','fontOpticalSizing','fontSynthesis','lineHeight','letterSpacing','wordSpacing','textTransform','textIndent','textRendering','tabSize'];
function inlineTextWidth(element){const computed=getComputedStyle(element);const probe=document.createElement('span');probe.textContent=element.textContent;for(const property of fallbackProbeProperties)probe.style[property]=computed[property];probe.style.position='fixed';probe.style.left='-100000px';probe.style.top='0';probe.style.visibility='hidden';probe.style.display='inline-block';probe.style.width='max-content';probe.style.maxWidth='none';probe.style.whiteSpace='pre';document.body.append(probe);const width=probe.getBoundingClientRect().width;probe.remove();return width}
function measuredRole(element){return element.dataset.typeRole||element.closest('[data-type-role]')?.dataset.typeRole}
function setMeasuredFamily(elements,stacks){for(const element of elements){const family=stacks[measuredRole(element)];if(family)element.style.setProperty('font-family',family,'important')}}
function measureFallbackSet(elements,stacks){setMeasuredFamily(elements,stacks);return new Map(elements.map(element=>[element.dataset.fallbackMeasure,{inlineWidth:inlineTextWidth(element),lines:renderedLineCount(element)}]))}
function signed(value,digits=1){const rounded=Number(value.toFixed(digits));return (rounded>0?'+':'')+rounded.toFixed(digits)}
let fallbackMeasurementRun=0;let fallbackMeasurementTimer;
async function refreshFallbackDiagnostics(){const run=++fallbackMeasurementRun;const elements=Array.from(document.querySelectorAll('[data-fallback-measure]'));if(!elements.length)return;const outputs=new Map(Array.from(document.querySelectorAll('[data-fallback-diagnostic]')).map(output=>[output.dataset.fallbackDiagnostic,output]));if(fontToggle?.checked){for(const output of outputs.values()){output.dataset.residual='false';output.querySelector('span').textContent='comparison paused while generated font faces are disabled'}return}const loads=[];for(const element of elements){const role=element.dataset.typeRole;const computed=getComputedStyle(element);const descriptor=computed.fontStyle+' '+computed.fontWeight+' '+computed.fontSize+' ';for(const stack of [primaryFamilyStacks[role],adjustedFamilyStacks[role]])if(stack)loads.push(document.fonts.load(descriptor+stack,element.textContent||''))}await Promise.allSettled(loads);await document.fonts.ready;if(run!==fallbackMeasurementRun)return;const previous=elements.map(element=>({element,value:element.style.getPropertyValue('font-family'),priority:element.style.getPropertyPriority('font-family')}));let primary,adjusted;try{primary=measureFallbackSet(elements,primaryFamilyStacks);adjusted=measureFallbackSet(elements,adjustedFamilyStacks)}finally{for(const entry of previous){if(entry.value)entry.element.style.setProperty('font-family',entry.value,entry.priority);else entry.element.style.removeProperty('font-family')}}if(run!==fallbackMeasurementRun)return;for(const [key,output] of outputs){const before=primary.get(key);const after=adjusted.get(key);if(!before||!after)continue;const widthDelta=after.inlineWidth-before.inlineWidth;const percent=before.inlineWidth===0?0:widthDelta/before.inlineWidth*100;const lineDelta=after.lines-before.lines;output.dataset.residual=String(Math.abs(widthDelta)>=0.05||lineDelta!==0);output.querySelector('span').textContent='inline width Δ '+signed(widthDelta)+'px ('+signed(percent)+'%) · line count Δ '+(lineDelta>0?'+':'')+lineDelta+' ('+before.lines+'→'+after.lines+')'}}
function scheduleFallbackDiagnostics(){clearTimeout(fallbackMeasurementTimer);fallbackMeasurementTimer=setTimeout(()=>void refreshFallbackDiagnostics(),80)}
document.querySelectorAll('[data-fallback-measure]').forEach(element=>element.addEventListener('input',scheduleFallbackDiagnostics));
document.fonts.ready.then(()=>{refreshFontStatus();refreshMetrics();scheduleFallbackDiagnostics()});
function draftPatch(){const roles={};for(const [key,value] of Object.entries(drafts)){const [role,variant]=key.split('::');roles[role]??={};if(variant==='base')roles[role].base=value;else{roles[role].variants??={};roles[role].variants[variant]=value}}return Object.keys(roles).length?JSON.stringify({roles},null,2):'No calibration changes.'}
function refreshPatch(){const target=document.querySelector('#draft-patch');if(target)target.textContent=draftPatch()}
document.querySelectorAll('.calibration').forEach(panel=>{const sample=panel.parentElement?.querySelector('.sample-preview');const baseline=JSON.parse(panel.dataset.baseline);const controls=Object.fromEntries(Array.from(panel.querySelectorAll('[data-control]')).map(control=>[control.dataset.control,control]));const update=()=>{const value={fontSize:controls.fontSize.value==='min'?'min':Number(controls.fontSize.value),weight:controls.weight.value,lineHeight:Number(controls.lineHeight.value),letterSpacing:Number(controls.letterSpacing.value)};const unchanged=JSON.stringify(value)===JSON.stringify(baseline);if(unchanged){sample?.style.removeProperty('font-size');sample?.style.removeProperty('font-weight');sample?.style.removeProperty('line-height');sample?.style.removeProperty('letter-spacing')}else{sample?.style.setProperty('font-size','var(--'+panel.dataset.atomicPrefix+'-'+value.fontSize+')');sample?.style.setProperty('font-weight','var(--'+panel.dataset.weightPrefix+value.weight+')');sample?.style.setProperty('line-height',String(value.lineHeight));sample?.style.setProperty('letter-spacing',value.letterSpacing===0?'0':value.letterSpacing+'em')}controls.lineHeight.nextElementSibling.value=String(value.lineHeight);controls.letterSpacing.nextElementSibling.value=value.letterSpacing+'em';const key=panel.dataset.role+'::'+(panel.dataset.variant||'base');if(unchanged){delete drafts[key];panel.classList.remove('changed')}else{drafts[key]=value;panel.classList.add('changed')}refreshPatch();refreshMetrics();scheduleFallbackDiagnostics()};Object.entries(controls).forEach(([name,control])=>{control.addEventListener('input',update);if(control.matches('input[type=range]')){control.title='Double-click to reset';control.addEventListener('dblclick',event=>{event.preventDefault();control.value=String(baseline[name]);update()})}});panel.querySelector('.reset-recipe')?.addEventListener('click',()=>{for(const [name,control] of Object.entries(controls))control.value=String(baseline[name]);update()})});
new ResizeObserver(()=>{refreshMetrics();scheduleFallbackDiagnostics()}).observe(document.querySelector('main'));window.addEventListener('resize',()=>{refreshMetrics();scheduleFallbackDiagnostics()});
document.querySelector('#copy-patch')?.addEventListener('click',async()=>{await navigator.clipboard.writeText(draftPatch());const button=document.querySelector('#copy-patch');if(button){button.textContent='Copied';setTimeout(()=>button.textContent='Copy patch',1200)}});
</script>
</body>
</html>\n`;
}
