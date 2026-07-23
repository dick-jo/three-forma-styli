import type { IR, ShadowContractRecipe } from '../generator/types.js';
import { toCss } from './css.js';

export interface ShadowSpecimenConfig {
	title?: string;
	interactive?: boolean;
}

function escapeHtml(value: string): string {
	return value
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;');
}

function samples(kind: 'box' | 'text', name: string, recipe: ShadowContractRecipe): string {
	return recipe.displayOrder
		.map((variant) => {
			const value = variant === 'base' ? recipe.base : recipe.variants[variant]!;
			const property = kind === 'box' ? 'box-shadow' : 'text-shadow';
			const preview =
				kind === 'box'
					? `<div class="box-stage"><div class="surface" style="${property}:var(--${value.token})">Aa</div></div>
             <div class="box-stage clipped"><div class="surface" style="${property}:var(--${value.token})">Aa</div></div>`
					: `<div class="text-stage" style="${property}:var(--${value.token})">Shadow glyph stress Aa 0123</div>`;
			return `<article class="sample">
        <header><strong>${escapeHtml(variant)}</strong><code>--${escapeHtml(value.token)}</code><span>${value.layers.length} layer${value.layers.length === 1 ? '' : 's'}</span></header>
        <div class="previews">${preview}</div>
        <pre>${escapeHtml(value.css)}</pre>
      </article>`;
		})
		.join('\n');
}

function recipeSection(kind: 'box' | 'text', name: string, recipe: ShadowContractRecipe): string {
	return `<section>
    <header class="recipe-header"><span>${kind} shadow</span><h2>${escapeHtml(name)}</h2></header>
    <div class="samples">${samples(kind, name, recipe)}</div>
  </section>`;
}

/** Self-contained visual stress test for layered, mode-aware shadow recipes. */
export function toShadowSpecimen(ir: IR, config: ShadowSpecimenConfig = {}): string {
	if (!ir.shadows) throw new Error('Shadow specimen requires shadow recipes');
	const title = config.title ?? 'TFS shadow specimen';
	const modes = [ir.modes.color.default, ...ir.modes.color.overrides].filter(Boolean);
	const sections = [
		...Object.entries(ir.shadows.box).map(([name, recipe]) => recipeSection('box', name, recipe)),
		...Object.entries(ir.shadows.text).map(([name, recipe]) => recipeSection('text', name, recipe)),
	].join('\n');
	const controls =
		config.interactive === false
			? ''
			: `<div class="tools"><label>color mode <select id="mode">${modes
					.map((mode) => `<option value="${escapeHtml(mode)}">${escapeHtml(mode)}</option>`)
					.join(
						''
					)}</select></label><label><input id="animate" type="checkbox"> animate comparisons</label></div>`;
	const script =
		config.interactive === false
			? ''
			: `<script>
const mode=document.querySelector('#mode');const animate=document.querySelector('#animate');
mode?.addEventListener('change',()=>{if(mode.value===${JSON.stringify(ir.modes.color.default)})document.documentElement.removeAttribute('data-color-mode');else document.documentElement.setAttribute('data-color-mode',mode.value)});
animate?.addEventListener('change',()=>document.body.toggleAttribute('data-animate',animate.checked));
</script>`;

	return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width">
<title>${escapeHtml(title)}</title><style>
${toCss(ir)}
*{box-sizing:border-box}html{background:var(--clr-bg,#111);color:var(--clr-ink,#eee);font-family:ui-monospace,monospace}body{margin:0;background:var(--clr-bg,#111)}main{width:min(1280px,calc(100% - 32px));margin:auto;padding:40px 0 100px}h1,h2,p{margin:0}.page-header{display:grid;gap:10px;margin-bottom:30px}.page-header p{max-width:80ch;opacity:.7}.tools{position:sticky;z-index:2;top:8px;display:flex;gap:18px;width:fit-content;margin:0 0 24px auto;padding:10px 12px;border:1px solid var(--clr-ink-a-min,#444);background:var(--clr-bg,#111)}.tools label{display:flex;align-items:center;gap:8px}.recipe-header{margin-top:44px;padding-bottom:12px;border-bottom:1px solid var(--clr-ink-a-min,#444)}.recipe-header span{font-size:11px;text-transform:uppercase;opacity:.6}.samples{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:16px;margin-top:16px}.sample{min-width:0;border:1px solid var(--clr-ink-a-min,#444);background:var(--clr-ev,var(--clr-bg,#181818))}.sample header{display:flex;flex-wrap:wrap;gap:8px;align-items:center;padding:12px;border-bottom:1px solid var(--clr-ink-a-min,#444)}.sample header span,.sample code{font-size:10px;opacity:.65}.previews{display:grid;grid-template-columns:1fr 1fr;gap:18px;min-height:180px;padding:34px;background:linear-gradient(135deg,var(--clr-bg,#111),var(--clr-pri-a-min,#292033))}.box-stage{display:grid;place-items:center;min-width:0;min-height:112px}.box-stage.clipped{overflow:hidden;outline:1px dashed var(--clr-neg-a-lo,#733)}.surface{display:grid;place-items:center;width:70px;height:70px;border-radius:14px;background:var(--clr-ev,#242424);color:var(--clr-ink,#eee);font:700 20px/1 system-ui}.text-stage{grid-column:1/-1;align-self:center;font:800 clamp(24px,4vw,54px)/.95 system-ui;color:var(--clr-pri,#b89cff)}pre{overflow:auto;margin:0;padding:12px;border-top:1px solid var(--clr-ink-a-min,#444);font:10px/1.45 ui-monospace,monospace;white-space:pre-wrap;opacity:.75}body[data-animate] .surface,body[data-animate] .text-stage{animation:pulse 1.6s ease-in-out infinite alternate}@keyframes pulse{from{filter:brightness(.75);transform:scale(.96)}to{filter:brightness(1.15);transform:scale(1.04)}}@media(max-width:680px){.previews{grid-template-columns:1fr;padding:24px}.tools{position:static;margin-left:0}}
</style></head><body><main><header class="page-header"><h1>${escapeHtml(title)}</h1><p>Inspect layer separation, clipping, saturated glow banding, light/dark mode behavior and text rasterization. The dashed stage deliberately clips overflow.</p></header>${controls}${sections}</main>${script}</body></html>
`;
}
