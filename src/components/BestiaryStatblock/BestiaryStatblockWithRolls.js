const html = window.html || String.raw;
import { ensureStyle } from '../../utils/style-utils.js';
import { openRollModal } from '../../pages/CharactersPage/RollModal.js';
import DiceService from '../../services/dice-service.js';
import rollStore from '../../services/roll-store.js';
import DamageUtils from '../../utils/damage-utils.js';

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
                                  title="Tirar ataque"
                              >
                                  🎯
                              </button>
                              <button
                                  class="button small"
                                  data-roll-damage="${escapeHtml(a.name)}"
                                  data-attack-damage="${escapeHtml(a.damage)}"
                                  title="Tirar daño"
                                  style="margin-left:.5rem;"
                              >
                                  💥
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

    // Bind attack roll events (attack only)
    container.querySelectorAll('[data-roll-attack]').forEach((btn) => {
        btn.addEventListener('click', () => {
            const attackName = btn.getAttribute('data-roll-attack');
            const attackBonus = Number(btn.getAttribute('data-attack-bonus')) || 0;

            // For NPC attacks: roll exploding 1d6 + attackBonus (attack roll only)
            try {
                const explodeRoll = (faces) => {
                    const rolls = [];
                    let r = 1 + Math.floor(Math.random() * faces);
                    rolls.push(r);
                    while (r === faces) {
                        r = 1 + Math.floor(Math.random() * faces);
                        rolls.push(r);
                    }
                    const sum = rolls.reduce((s, v) => s + v, 0);
                    return { rolls, sum };
                };

                const atk = explodeRoll(6);
                const attackTotal = atk.sum + attackBonus;
                const characterName =
                    activeParticipant && activeParticipant.type === 'npc-group' && selectedCreatureIndex !== null
                        ? activeParticipant.creatures[selectedCreatureIndex].name
                        : creature.name;

                const breakdown = `attack(1d6 exploding)=${atk.rolls.join('+')} ; bonus=${attackBonus}`;

                DiceService.showRollToast({
                    characterName,
                    rollType: `${attackName} (ataque)`,
                    total: attackTotal,
                    rolls: atk.rolls,
                    breakdown,
                });

                // Log attack entry
                if (activeParticipant && activeParticipant.type === 'npc-group' && selectedCreatureIndex !== null) {
                    const selectedCreature = activeParticipant.creatures[selectedCreatureIndex];
                    if (!selectedCreature.rollLog) selectedCreature.rollLog = [];

                    const entry = {
                        type: 'attack',
                        ts: Date.now(),
                        notation: `${attackName} (atk)`,
                        rolls: atk.rolls,
                        total: attackTotal,
                        attackName,
                        attackBonus,
                        details: {
                            exploding: true,
                            rolls: atk.rolls,
                            sum: atk.sum,
                            bonus: attackBonus,
                        },
                    };

                    selectedCreature.rollLog.unshift(entry);
                    if (selectedCreature.rollLog.length > 50) selectedCreature.rollLog.length = 50;
                    if (onPersist) onPersist();
                }
            } catch (err) {
                console.error('Error rolling attack:', err);
            }
        });
    });

    // Bind damage roll events (damage only)
    container.querySelectorAll('[data-roll-damage]').forEach((btn) => {
        btn.addEventListener('click', () => {
            const attackName = btn.getAttribute('data-roll-damage');
            const attackDamage = btn.getAttribute('data-attack-damage') || '';

            try {
                const characterName =
                    activeParticipant && activeParticipant.type === 'npc-group' && selectedCreatureIndex !== null
                        ? activeParticipant.creatures[selectedCreatureIndex].name
                        : creature.name;

                if (attackDamage && attackDamage.trim()) {
                    // Roll damage using the shared utility
                    rollDamage(
                        container,
                        characterName,
                        attackName,
                        attackDamage,
                        activeParticipant,
                        selectedCreatureIndex,
                        onPersist
                    );
                }
            } catch (err) {
                console.error('Error rolling damage:', err);
            }
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
    try {
        // Use shared utility to parse and evaluate damage formulas
        const parsed = DamageUtils.parseDamageFormula(damageFormula);
        if (!parsed.length) {
            DiceService.showRollToast({
                characterName: creatureName,
                rollType: `${attackName} (daño)`,
                total: damageFormula,
                rolls: [],
                breakdown: `Fórmula: ${damageFormula}`,
            });
            return;
        }

        // Evaluate parts (damage dice are non-exploding by default)
        const evalRes = DamageUtils.evaluateDamageParts(parsed, { explodeDice: false });
        const total = evalRes.total;
        const allRolls = evalRes.flatRolls || [];
        const breakdown = evalRes.breakdown || '';

        DiceService.showRollToast({
            characterName: creatureName,
            rollType: `${attackName} (daño)`,
            total,
            rolls: allRolls,
            breakdown: `${damageFormula} => ${breakdown} => ${total}`,
        });

        // Add to group log if applicable
        if (activeParticipant && activeParticipant.type === 'npc-group' && selectedCreatureIndex !== null) {
            const selectedCreature = activeParticipant.creatures[selectedCreatureIndex];
            if (!selectedCreature.rollLog) selectedCreature.rollLog = [];

            const entry = {
                type: 'damage',
                ts: Date.now(),
                notation: damageFormula,
                rolls: allRolls,
                total,
                attackName,
                damageFormula,
                details: {
                    formula: damageFormula,
                    parts: parsed,
                    rolledParts: evalRes.partsResults || [],
                    total,
                },
            };

            selectedCreature.rollLog.unshift(entry);
            if (selectedCreature.rollLog.length > 200) selectedCreature.rollLog.length = 200;
            if (onPersist) onPersist();
        }
    } catch (err) {
        console.error('Error rolling damage:', err);
        DiceService.showRollToast({
            characterName: creatureName,
            rollType: `${attackName} (daño)`,
            total: damageFormula,
            rolls: [],
            breakdown: `Fórmula: ${damageFormula}`,
        });
    }
}
