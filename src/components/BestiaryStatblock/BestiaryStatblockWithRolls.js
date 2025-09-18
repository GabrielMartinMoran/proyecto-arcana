const html = window.html || String.raw;
import { ensureStyle } from '../../utils/style-utils.js';
import { openRollModal } from '../../pages/CharactersPage/RollModal.js';
import DiceService from '../../services/dice-service.js';
import rollStore from '../../services/roll-store.js';

const escapeHtml = (s) =>
    String(s).replace(
        /[&<>"']/g,
        (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]
    );

const slugify = (s) =>
    String(s)
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');

const renderKV = (k, v) => html`<span class="kv"><strong>${k}:</strong> ${escapeHtml(v)}</span>`;

const renderList = (items) =>
    items && items.length
        ? html`<ul class="list">
              ${items.map((x) => html`<li>${escapeHtml(x)}</li>`).join('')}
          </ul>`
        : '';

const renderPairs = (items) =>
    items && items.length
        ? html`<ul class="list">
              ${items
                  .map(
                      (x) =>
                          html`<li><strong>${escapeHtml(x.name)}:</strong> ${escapeHtml(x.detail || x.note || '')}</li>`
                  )
                  .join('')}
          </ul>`
        : '';

const renderAttacks = (items, creatureName) =>
    items && items.length
        ? html`<ul class="list">
              ${items
                  .map(
                      (a) =>
                          html`<li>
                              <strong>${escapeHtml(a.name)}:</strong> +${Number(a.bonus) || 0}
                              (${escapeHtml(a.damage)})${a.note ? ` — ${escapeHtml(a.note)}` : ''}
                              <button
                                  class="button small"
                                  data-roll-attack="${escapeHtml(a.name)}"
                                  data-attack-bonus="${Number(a.bonus) || 0}"
                                  data-attack-damage="${escapeHtml(a.damage)}"
                                  title="Tirar ataque"
                              >
                                  🎲
                              </button>
                          </li>`
                  )
                  .join('')}
          </ul>`
        : '';

const renderUses = (uses) => {
    if (!uses || typeof uses !== 'object') return '';
    const type = String(uses.type || '').toUpperCase();
    const qty = Number(uses.qty) || 0;
    if (type === 'RELOAD') return html`<span class="chip">Recarga ${qty}+</span>`;
    if (type === 'USES') return html`<span class="chip">${qty} ${qty === 1 ? 'uso' : 'usos'}</span>`;
    return '';
};

export function renderBestiaryStatblockWithRolls(c) {
    ensureStyle('./src/components/BestiaryStatblock/BestiaryStatblock.css');
    const esquivaNote = c.stats?.esquiva?.note ? ` (${escapeHtml(c.stats.esquiva.note)})` : '';
    const mitigNote = c.stats?.mitigacion?.note ? ` (${escapeHtml(c.stats.mitigacion.note)})` : '';
    const velocNote = c.stats?.velocidad?.note ? ` (${escapeHtml(c.stats.velocidad.note)})` : '';

    return html` <article class="statblock" id="${slugify(c.name)}">
        <div class="header">
            <h3>${escapeHtml(c.name)}</h3>
            ${renderKV('NA', c.na)}
        </div>
        <div class="attributes">
            <span class="kv">
                <strong>Cuerpo:</strong> ${escapeHtml(c.attributes?.cuerpo)}
                <button
                    class="button small"
                    data-roll-attribute="cuerpo"
                    data-attribute-value="${c.attributes?.cuerpo || 0}"
                    title="Tirar Cuerpo"
                >
                    🎲
                </button>
            </span>
            <span class="kv">
                <strong>Reflejos:</strong> ${escapeHtml(c.attributes?.reflejos)}
                <button
                    class="button small"
                    data-roll-attribute="reflejos"
                    data-attribute-value="${c.attributes?.reflejos || 0}"
                    title="Tirar Reflejos"
                >
                    🎲
                </button>
            </span>
            <span class="kv">
                <strong>Mente:</strong> ${escapeHtml(c.attributes?.mente)}
                <button
                    class="button small"
                    data-roll-attribute="mente"
                    data-attribute-value="${c.attributes?.mente || 0}"
                    title="Tirar Mente"
                >
                    🎲
                </button>
            </span>
            <span class="kv">
                <strong>Instinto:</strong> ${escapeHtml(c.attributes?.instinto)}
                <button
                    class="button small"
                    data-roll-attribute="instinto"
                    data-attribute-value="${c.attributes?.instinto || 0}"
                    title="Tirar Instinto"
                >
                    🎲
                </button>
            </span>
            <span class="kv">
                <strong>Presencia:</strong> ${escapeHtml(c.attributes?.presencia)}
                <button
                    class="button small"
                    data-roll-attribute="presencia"
                    data-attribute-value="${c.attributes?.presencia || 0}"
                    title="Tirar Presencia"
                >
                    🎲
                </button>
            </span>
        </div>
        <div class="derived-attributes">
            ${renderKV('Salud', c.stats?.salud)}
            ${renderKV('Esquiva', `${c.stats?.esquiva?.value ?? ''}${esquivaNote}`)}
            ${renderKV('Mitigación', `${c.stats?.mitigacion?.value ?? ''}${mitigNote}`)}
            ${renderKV('Velocidad', `${c.stats?.velocidad?.value ?? ''}${velocNote}`)}
        </div>
        <div class="section">
            <strong>Lenguas:</strong>
            ${renderList(c.languages || [])}
        </div>
        <div class="section">
            <strong>Ataques:</strong>
            ${renderAttacks(c.attacks || [], c.name)}
        </div>
        ${c.traits && c.traits.length
            ? html`<div class="section"><strong>Rasgos:</strong>${renderPairs(c.traits)}</div>`
            : ''}
        ${c.actions && c.actions.length
            ? html`<div class="section">
                  <strong>Acciones:</strong>
                  <ul class="list">
                      ${c.actions
                          .map(
                              (a) =>
                                  html`<li>
                                      <strong>${escapeHtml(a.name)} (<em>${renderUses(a.uses)}</em>):</strong>
                                      ${escapeHtml(a.detail || '')}
                                  </li>`
                          )
                          .join('')}
                  </ul>
              </div>`
            : ''}
        ${c.reactions && c.reactions.length
            ? html`<div class="section">
                  <strong>Reacciones:</strong>
                  <ul class="list">
                      ${c.reactions
                          .map(
                              (r) =>
                                  html`<li>
                                      <strong>${escapeHtml(r.name)}:</strong> ${escapeHtml(r.detail || r.note || '')}
                                      ${r.uses ? renderUses(r.uses) : ''}
                                  </li>`
                          )
                          .join('')}
                  </ul>
              </div>`
            : ''}
        ${c.legendary && c.legendary.length
            ? html`<div class="section">
                  <strong>Acciones Legendarias:</strong>
                  <ul class="list">
                      ${c.legendary
                          .map(
                              (l) =>
                                  html`<li>
                                      <strong>${escapeHtml(l.name)}:</strong> ${escapeHtml(l.detail || l.note || '')}
                                      ${l.uses ? renderUses(l.uses) : ''}
                                  </li>`
                          )
                          .join('')}
                  </ul>
              </div>`
            : ''}
        ${c.spells && c.spells.length
            ? html`<div class="section">
                  <strong>Conjuros:</strong>
                  <ul class="list">
                      ${c.spells
                          .map(
                              (s) =>
                                  html`<li>
                                      <strong>${escapeHtml(s.name)}:</strong> ${escapeHtml(s.detail || s.note || '')}
                                      ${s.uses ? renderUses(s.uses) : ''}
                                  </li>`
                          )
                          .join('')}
                  </ul>
              </div>`
            : ''}
        ${c.equipment && c.equipment.length
            ? html`<div class="section">
                  <strong>Equipo:</strong>
                  <ul class="list">
                      ${c.equipment.map((e) => html`<li>${escapeHtml(e)}</li>`).join('')}
                  </ul>
              </div>`
            : ''}
        ${c.behavior
            ? html`<div class="section">
                  <strong>Comportamiento:</strong>
                  <div class="bio-content">${escapeHtml(c.behavior)}</div>
              </div>`
            : ''}
        ${c.description
            ? html`<div class="section"><strong>Descripción:</strong> ${escapeHtml(c.description)}</div>`
            : ''}
    </article>`;
}

export function bindBestiaryRollEvents(
    container,
    creature,
    activeParticipant = null,
    selectedCreatureIndex = null,
    onPersist = null
) {
    // Bind attribute roll events
    container.querySelectorAll('[data-roll-attribute]').forEach((btn) => {
        btn.addEventListener('click', () => {
            const attribute = btn.getAttribute('data-roll-attribute');
            const attributeValue = Number(btn.getAttribute('data-attribute-value')) || 0;

            if (attributeValue <= 0) return;

            // Open roll modal for attribute
            openRollModal(
                container,
                {
                    attributeName: attribute,
                    attributeValue: attributeValue,
                    maxSuerte: 0, // NPCs don't have luck
                    currentSuerte: 0,
                },
                (result) => {
                    if (!result) return;

                    // Determine the correct character name for groups
                    const characterName =
                        activeParticipant && activeParticipant.type === 'npc-group' && selectedCreatureIndex !== null
                            ? activeParticipant.creatures[selectedCreatureIndex].name
                            : creature.name;

                    // Show toast with result
                    DiceService.showAttributeRoll({
                        characterName: characterName,
                        attributeName: attribute,
                        result: result,
                    });

                    // Add to group log if it's a group
                    if (activeParticipant && activeParticipant.type === 'npc-group' && selectedCreatureIndex !== null) {
                        const selectedCreature = activeParticipant.creatures[selectedCreatureIndex];
                        if (!selectedCreature.rollLog) selectedCreature.rollLog = [];

                        const entry = {
                            type: 'attribute',
                            ts: Date.now(),
                            notation: `${attribute} (${attributeValue}d6${result.d6Rolls && result.d6Rolls.length > 1 ? ` explotando` : ''})`,
                            rolls: result.d6Rolls || [result.d6], // Use explosion rolls if available
                            total: result.total,
                            attribute: attribute,
                            attributeValue: attributeValue,
                            details: {
                                d6: result.d6,
                                d6Rolls: result.d6Rolls, // Individual explosion rolls
                                advMod: result.advMod,
                                advantage: result.advantage,
                                base: result.base,
                                extras: result.extras,
                                luck: result.luck,
                                exploded: result.d6Rolls && result.d6Rolls.length > 1, // Flag for explosion
                                parts: [
                                    {
                                        type: 'attribute',
                                        attribute: attribute,
                                        value: attributeValue,
                                        notation: `${attributeValue}d6${result.d6Rolls && result.d6Rolls.length > 1 ? ` explotando` : ''}`,
                                        rolls: result.d6Rolls || [result.d6],
                                        sum: result.total,
                                        sign: 1,
                                    },
                                ],
                            },
                        };

                        selectedCreature.rollLog.unshift(entry);
                        if (selectedCreature.rollLog.length > 50) {
                            selectedCreature.rollLog.length = 50;
                        }

                        // Add to roll store
                        rollStore.addRoll({ ...entry, who: characterName });

                        // Persist changes
                        if (onPersist) onPersist();
                    }
                }
            );
        });
    });

    // Bind attack roll events
    container.querySelectorAll('[data-roll-attack]').forEach((btn) => {
        btn.addEventListener('click', () => {
            const attackName = btn.getAttribute('data-roll-attack');
            const attackBonus = Number(btn.getAttribute('data-attack-bonus')) || 0;
            const attackDamage = btn.getAttribute('data-attack-damage') || '';

            // Open roll modal for attack (using attack bonus as "attribute")
            openRollModal(
                container,
                {
                    attributeName: attackName,
                    attributeValue: attackBonus,
                    maxSuerte: 0, // NPCs don't have luck
                    currentSuerte: 0,
                },
                (result) => {
                    if (!result) return;

                    // Determine the correct character name for groups
                    const characterName =
                        activeParticipant && activeParticipant.type === 'npc-group' && selectedCreatureIndex !== null
                            ? activeParticipant.creatures[selectedCreatureIndex].name
                            : creature.name;

                    // Show attack roll toast
                    const breakdown = `1d6=${result.d6} | ${result.advantage === 'normal' ? '±0' : `${result.advantage}=${result.advMod >= 0 ? '+' : ''}${result.advMod}`} | bonus=${result.base} | mods=${result.extras} | suerte=${result.luck}`;

                    DiceService.showRollToast({
                        characterName: characterName,
                        rollType: `${attackName} (ataque)`,
                        total: result.total,
                        rolls: [result.d6],
                        breakdown: breakdown,
                    });

                    // Add to group log if it's a group
                    if (activeParticipant && activeParticipant.type === 'npc-group' && selectedCreatureIndex !== null) {
                        const selectedCreature = activeParticipant.creatures[selectedCreatureIndex];
                        if (!selectedCreature.rollLog) selectedCreature.rollLog = [];

                        const entry = {
                            type: 'attack',
                            ts: Date.now(),
                            notation: `${attackName} (${attackBonus}d6)`,
                            rolls: [result.d6],
                            total: result.total,
                            attackName: attackName,
                            attackBonus: attackBonus,
                            details: {
                                d6: result.d6,
                                advMod: result.advMod,
                                advantage: result.advantage,
                                base: result.base,
                                extras: result.extras,
                                luck: result.luck,
                                parts: [
                                    {
                                        type: 'attack',
                                        attackName: attackName,
                                        value: attackBonus,
                                        notation: `${attackBonus}d6`,
                                        rolls: [result.d6],
                                        sum: result.total,
                                        sign: 1,
                                    },
                                ],
                            },
                        };

                        selectedCreature.rollLog.unshift(entry);
                        if (selectedCreature.rollLog.length > 50) {
                            selectedCreature.rollLog.length = 50;
                        }

                        // Persist changes
                        if (onPersist) onPersist();
                    }

                    // If there's damage, roll it too
                    if (attackDamage && attackDamage.trim()) {
                        setTimeout(() => {
                            rollDamage(
                                container,
                                characterName,
                                attackName,
                                attackDamage,
                                activeParticipant,
                                selectedCreatureIndex,
                                onPersist
                            );
                        }, 1000); // Small delay to show attack first
                    }
                }
            );
        });
    });
}

function rollDamage(
    container,
    creatureName,
    attackName,
    damageFormula,
    activeParticipant = null,
    selectedCreatureIndex = null,
    onPersist = null
) {
    // Simple damage roll without modal (direct roll)
    try {
        // Parse damage formula (e.g., "1d6+2", "2d4", "1d8+1d4")
        const cleaned = damageFormula.replace(/\s+/g, '').toLowerCase();
        const diceMatches = cleaned.match(/(\d+)d(\d+)/g);

        if (!diceMatches) {
            // No dice in formula, just show the formula
            DiceService.showRollToast({
                characterName: creatureName,
                rollType: `${attackName} (daño)`,
                total: damageFormula,
                rolls: [],
                breakdown: `Fórmula: ${damageFormula}`,
            });
            return;
        }

        let total = 0;
        const allRolls = [];
        let resultFormula = cleaned;

        // Roll each dice group
        diceMatches.forEach((match) => {
            const [n, faces] = match.split('d').map(Number);
            const rolls = [];
            let sum = 0;
            for (let i = 0; i < n; i++) {
                const r = 1 + Math.floor(Math.random() * faces);
                rolls.push(r);
                sum += r;
            }
            resultFormula = resultFormula.replace(match, sum);
            allRolls.push(...rolls);
        });

        // Evaluate the final formula
        const damageTotal = eval(resultFormula) || 0;

        // Show damage roll toast
        DiceService.showRollToast({
            characterName: creatureName,
            rollType: `${attackName} (daño)`,
            total: damageTotal,
            rolls: allRolls,
            breakdown: `Fórmula: ${damageFormula} = ${damageTotal}`,
        });

        // Add to group log if it's a group
        if (activeParticipant && activeParticipant.type === 'npc-group' && selectedCreatureIndex !== null) {
            const selectedCreature = activeParticipant.creatures[selectedCreatureIndex];
            if (!selectedCreature.rollLog) selectedCreature.rollLog = [];

            const entry = {
                type: 'damage',
                ts: Date.now(),
                notation: damageFormula,
                rolls: allRolls,
                total: damageTotal,
                attackName: attackName,
                damageFormula: damageFormula,
                details: {
                    formula: damageFormula,
                    rolls: allRolls,
                    total: damageTotal,
                    parts: [
                        {
                            type: 'damage',
                            formula: damageFormula,
                            rolls: allRolls,
                            sum: damageTotal,
                            sign: 1,
                        },
                    ],
                },
            };

            selectedCreature.rollLog.unshift(entry);
            if (selectedCreature.rollLog.length > 50) {
                selectedCreature.rollLog.length = 50;
            }

            // Persist changes
            if (onPersist) onPersist();
        }
    } catch (error) {
        console.error('Error rolling damage:', error);
        // Fallback: just show the formula
        DiceService.showRollToast({
            characterName: creatureName,
            rollType: `${attackName} (daño)`,
            total: damageFormula,
            rolls: [],
            breakdown: `Fórmula: ${damageFormula}`,
        });
    }
}
