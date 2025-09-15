/**
 * CharacterService - business rules for characters (PP, equipment, helpers)
 */

const CharacterService = {
    /** Normalize character object with default fields (non-destructive) */
    normalize(c) {
        const base = {
            id: c.id || (crypto.randomUUID ? crypto.randomUUID() : String(Date.now())),
            name: c.name || 'Nuevo personaje',
            attributes: {
                Cuerpo: 1,
                Reflejos: 1,
                Mente: 1,
                Instinto: 1,
                Presencia: 1,
                ...(c.attributes || {}),
            },
            cards: Array.isArray(c.cards) ? c.cards : [],
            activeCards: Array.isArray(c.activeCards) ? c.activeCards : [],
            activeSlots: typeof c.activeSlots === 'number' ? c.activeSlots : 0,
            pp: Number.isFinite(c.pp) ? Number(c.pp) : 0,
            gold: Number.isFinite(c.gold) ? Number(c.gold) : 0,
            equipmentList: Array.isArray(c.equipmentList) ? c.equipmentList : [],
            modifiers: Array.isArray(c.modifiers) ? c.modifiers : [],
            suerte: Number.isFinite(c.suerte) ? Number(c.suerte) : 0,
            hp: Number.isFinite(c.hp) ? Number(c.hp) : 0,
            tempHp: Number.isFinite(c.tempHp) ? Number(c.tempHp) : 0,
            notes: typeof c.notes === 'string' ? c.notes : '',
            portraitUrl: typeof c.portraitUrl === 'string' ? c.portraitUrl : '',
            bio: typeof c.bio === 'string' ? c.bio : '',
            languages: typeof c.languages === 'string' ? c.languages : '',
            mitigacion: Number.isFinite(c.mitigacion) ? Number(c.mitigacion) : 0,
            ppHistory: Array.isArray(c.ppHistory) ? c.ppHistory : [],
            rollLog: Array.isArray(c.rollLog) ? c.rollLog : [],
            cardUses: c.cardUses && typeof c.cardUses === 'object' ? c.cardUses : {},
        };
        // migrate equipment string -> list
        if (!base.equipmentList.length && c.equipment) {
            const trimmed = String(c.equipment || '').trim();
            base.equipmentList = trimmed ? [{ qty: 1, name: trimmed, notes: '' }] : [];
        }
        return base;
    },

    /** Add PP with reason, return updated {pp, ppHistory} */
    addPP(c, amount, reason) {
        const qty = Math.max(1, Number(amount) || 0);
        const rsn = String(reason || '').trim();
        if (!rsn) return c;
        c.pp = (Number(c.pp) || 0) + qty;
        c.ppHistory = Array.isArray(c.ppHistory) ? c.ppHistory : [];
        c.ppHistory.push({ ts: Date.now(), type: 'add', amount: qty, reason: rsn });
        return c;
    },

    /** Spend PP with reason, return updated {pp, ppHistory} */
    spendPP(c, amount, reason) {
        const qty = Math.max(1, Number(amount) || 0);
        const rsn = String(reason || '').trim();
        if (!rsn) return c;
        c.pp = (Number(c.pp) || 0) - qty;
        c.ppHistory = Array.isArray(c.ppHistory) ? c.ppHistory : [];
        c.ppHistory.push({ ts: Date.now(), type: 'spend', amount: qty, reason: rsn });
        return c;
    },

    /** Undo a PP history entry by timestamp */
    undoPP(c, ts) {
        const hist = Array.isArray(c.ppHistory) ? c.ppHistory : [];
        const entry = hist.find((x) => x.ts === ts);
        if (!entry) return c;
        const amount = Math.max(0, Number(entry.amount) || 0);
        if (entry.type === 'spend') c.pp = (Number(c.pp) || 0) + amount;
        if (entry.type === 'add') c.pp = (Number(c.pp) || 0) - amount;
        c.ppHistory = hist.filter((x) => x.ts !== ts);
        return c;
    },
};

export default CharacterService;


