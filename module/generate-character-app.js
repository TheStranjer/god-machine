import { hitLLMEndpoint } from "./llm-interface.js";
import { steps } from "./steps.js";
import { actorToCharacterSheet } from "./character-sheet.js";

export class GenerateCharacterApp extends FormApplication {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "generate-character-app",
      classes: ["mta", "generate-character"],
      title: "Generate Character",
      template: "modules/god-machine/templates/generate-character.html",
      width: 550,
      height: "auto",
      closeOnSubmit: false,
      submitOnChange: false
    });
  }

  /** @param {Actor} actor */
  constructor(actor) {
    super();
    this.actor = actor;
  }

  /* ------------------ RENDER DATA ------------------ */
  getData() {
    const actor = this.actor;
    const ctx = {
      baseSections: this._buildBaseSections(actor),
      splatSections: this._buildSplatSections(actor),
      splatLabel: actor?.system?.characterType || "Mortal",
      hasSplat: this._buildSplatSections(actor).length > 0
    };
    return ctx;
  }

  /* ------------------ UI HELPERS ------------------ */
  _buildBaseSections(actor) {
    return [
      { id: "demographics",       label: "Demographics",        checked: steps.demographics?.defaultChecked?.(actor) ?? true },
      { id: "attributes",         label: "Attributes",          checked: steps.attributes?.defaultChecked?.(actor)   ?? true },
      { id: "skills",             label: "Skills",              checked: steps.skills?.defaultChecked?.(actor)       ?? true },
      { id: "skillSpecialties",   label: "Skill Specialties",   checked: steps.skillSpecialties?.defaultChecked?.(actor) ?? true },
      { id: "merits",             label: "Merits",              checked: steps.merits?.defaultChecked?.(actor)       ?? true }
    ];
  }

  _buildSplatSections(actor) {
    const splat = actor?.system?.characterType || "";
    switch (splat) {
      case "Werewolf": return [
        { id: "renown",            label: "Renown",             checked: steps.renown?.defaultChecked?.(actor)              ?? true },
        { id: "blood_and_bone",    label: "Blood & Bone",       checked: steps.blood_and_bone?.defaultChecked?.(actor)      ?? true },
        { id: "uratha_touchstones",label: "Touchstones",        checked: steps.uratha_touchstones?.defaultChecked?.(actor)  ?? true },
        { id: "gifts",             label: "Gifts",              checked: steps.gifts?.defaultChecked?.(actor)               ?? true },
        { id: "rites",             label: "Rites",              checked: steps.rites?.defaultChecked?.(actor)               ?? true }
      ];
      case "Vampire": return [
        { id: "masks_and_dirges",  label: "Masks & Dirges",     checked: steps.masks_and_dirges?.defaultChecked?.(actor)    ?? true },
        { id: "kindred_touchstone",label: "Touchstone",         checked: steps.kindred_touchstone?.defaultChecked?.(actor)  ?? true },
        { id: "disciplines",       label: "Disciplines",        checked: steps.disciplines?.defaultChecked?.(actor)         ?? true }
      ];
      case "Mage": return [
        { id: "nimbus",            label: "Nimbus",             checked: steps.nimbus?.defaultChecked?.(actor)              ?? true },
        { id: "dedicated_magical_tool", label: "Dedicated Magical Tool", checked: steps.dedicated_magical_tool?.defaultChecked?.(actor) ?? true },
        { id: "arcana",            label: "Arcana",             checked: steps.arcana?.defaultChecked?.(actor)              ?? true },
        { id: "rotes",             label: "Rotes",              checked: steps.rotes?.defaultChecked?.(actor)               ?? true },
        { id: "obsessions",        label: "Obsessions",         checked: steps.obsessions?.defaultChecked?.(actor)          ?? true },
        { id: "praxes",            label: "Praxes",             checked: steps.praxes?.defaultChecked?.(actor)              ?? true },
        { id: "resistance_attribute", label: "Resistance Attribute", checked: steps.resistance_attribute?.defaultChecked?.(actor) ?? true }
      ];
      case "Changeling": return [
        { id: "mien",              label: "Mien",               checked: steps.mien?.defaultChecked?.(actor)                ?? true },
        { id: "needle_and_thread", label: "Needle & Thread",    checked: steps.needle_and_thread?.defaultChecked?.(actor)   ?? true },
        { id: "touchstone",        label: "Touchstone",         checked: steps.touchstone?.defaultChecked?.(actor)          ?? true },
        { id: "contracts",         label: "Contracts",          checked: steps.contracts?.defaultChecked?.(actor)           ?? true }
      ];
      default: return [];
    }
  }

  /* ------------------ LISTENERS ------------------ */
  activateListeners(html) {
    super.activateListeners(html);
  }

  /* ------------------ STATUS UTILS ------------------ */
  _setStatus(stepId, status) {
    const row = this.element.find(`.step-row[data-step="${stepId}"]`);
    row.removeClass("step-queued step-current step-done step-failed").addClass(`step-${status}`);
  }

  _queueAll(stepIds) {
    stepIds.forEach(id => this._setStatus(id, "queued"));
  }

  /* ------------------ CORE: GENERATE ------------------ */
  async _updateObject(event, formData) {
    event.preventDefault();
    const html = this.element;
    const selected = Object.keys(formData)
      .filter(key => key.endsWith("-step") && formData[key] === true)
      .map(key => key.replace(/-step$/, ""));

    html.find('input').prop('disabled', true);

    // visual prep
    const generateBtn = html.find(".generate-btn");
    generateBtn.prop("disabled", true);
    this._queueAll(selected);

    ui.notifications.info(`Generating: ${selected.join(", ")}`);

    let position = 0;
    for (const stepName of selected) {
      position++;
      const step = steps[stepName];
      if (!step) {
        ui.notifications.warn(`No step defined for ${stepName}. Skipping.`);
        this._setStatus(stepName, "failed");
        continue;
      }

      this._setStatus(stepName, "current");

      const maximumAttempts = step.maximumAttempts(this.actor) || 3;
      let attempts = 0;
      let appendage = [];
      let success = false;
      let response = null;
      let data = null;

      while (attempts < maximumAttempts) {
        attempts++;

        response = await hitLLMEndpoint(
          step.prompt(this.actor),
          actorToCharacterSheet(this.actor),
          step.tool(this.actor),
          appendage,
          step?.reasoning_effort?.(this.actor)
        );

        if (response.error) {
          appendage.push({ role:"assistant", content:`Error: ${response.error.message || "An error occurred while generating."}` });
          continue;
        }

        const args = response?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
        appendage.push({ role:"assistant", content:`Attempt ${attempts} of ${maximumAttempts}: ${args || "No content returned."}` });

        if (!args) continue;

        data = JSON.parse(args);
        const validationErrors = step.validate(this.actor, data);
        if (validationErrors.length > 0) {
          appendage.push({ role:"user", content:`Validation errors (try again): ${validationErrors.join(", ")}` });
          continue;
        }

        success = true;
        break;
      }

      if (success) {
        await step.apply(this.actor, data);
        this._setStatus(stepName, "done");
        ui.notifications.info(`Generated ${stepName} after ${attempts} attempt(s).`);
      } else {
        this._setStatus(stepName, "failed");
        ui.notifications.error(`Failed ${stepName} after ${maximumAttempts} attempts.`);
        console.error(`Failed to generate ${stepName}.`, {actor:this.actor, stepName, attempts, maximumAttempts, appendage});
      }
    }

    html.find('input').prop('disabled', false);
    generateBtn.prop("disabled", false);
  }

  /* ------------------ ENTRY POINT ------------------ */
  static open(actor) {
    return new GenerateCharacterApp(actor).render(true);
  }
}
