import { hitLLMEndpoint } from "./llm-interface.js";
import { steps } from "./steps.js";
import { actorToCharacterSheet } from "./character-sheet.js";

export class GenerateCharacterDialog extends Dialog {
  static get defaultOptions () {
    return {...super.defaultOptions, ...{
      id: "generate-character-dialog",
      classes: ["mta", "generate-character"],
      title: "Generate Character",
      width: 500
    }};
  }

  constructor (actor) {
    const content = GenerateCharacterDialog.buildContent(actor);

    const buttons = {
      generate: {
        icon: '<i class="fas fa-robot"></i>',
        label: "Generate",
        callback: html => GenerateCharacterDialog._onGenerate(actor, html)
      }
    };

    super({
      title: `Generate for ${actor.name}`,
      content,
      buttons,
      default: "generate"
    });

    this.actor = actor;
  }

  static buildContent (actor) {
    console.log("Demographics should be checked", steps["demographics"]?.defaultChecked?.(actor));
    const baseSections = [
      { id: "demographics", label: "Demographics", checked: steps["demographics"]?.defaultChecked?.(actor) ?? true },
      { id: "attributes", label: "Attributes", checked: steps["attributes"]?.defaultChecked?.(actor) ?? true },
      { id: "skills", label: "Skills", checked: steps["skills"]?.defaultChecked?.(actor) ?? true },
      { id: "skillSpecialties", label: "Skill Specialties", checked: steps["skillSpecialties"]?.defaultChecked?.(actor) ?? true },
      { id: "merits", label: "Merits", checked: steps["merits"]?.defaultChecked?.(actor) ?? true }
    ];

    const splatSections = this.getSplatSections(actor);

    return `
      <form>
        <div class="form-group">
          <table class="god-machine-generate-character-table">
            <tr>
              <td class="god-machine-generate-character-table-col">
                <h2>Base Sections</h2>
                ${baseSections.map(this.sectionCheckbox).join("")}
              </td>
              <td class="god-machine-generate-character-table-col">
                <h2>${actor?.system?.characterType || "Mortal"} Template</h2>
                ${splatSections.map(this.sectionCheckbox).join("")}
              </td>
            </tr>
          </table>
        </div>
      </form>`;
  }

  static sectionCheckbox(section) {
    return `
      <div class="row">
       <div class="col">
          <label class="checkbox">
            <input type="checkbox" name="${section.id}"${section.checked ? " checked" : ""} />
            ${section.label}
          </label>
        </div>
      </div>
    `;
  }

  static getSplatSections (actor) {
    const splat = actor?.system?.characterType || '';
    switch (splat) {
      case "Werewolf":
        return [
          { id: "renown", label: "Renown", checked: steps["renown"]?.defaultChecked?.(actor) ?? true },
          { id: "blood_and_bone", label: "Blood &amp; Bone", checked: steps["blood_and_bone"]?.defaultChecked?.(actor) ?? true },
          { id: "uratha_touchstones", label: "Touchstones", checked: steps["uratha_touchstones"]?.defaultChecked?.(actor) ?? true },
          { id: "gifts", label: "Gifts", checked: steps["gifts"]?.defaultChecked?.(actor) ?? true },
          { id: "rites", label: "Rites", checked: steps["rites"]?.defaultChecked?.(actor) ?? true }
        ];
      case "Vampire":
        return [
          { id: "masks_and_dirges", label: "Masks &amp; Dirges", checked: steps["masks_and_dirges"]?.defaultChecked?.(actor) ?? true },
          { id: "kindred_touchstone", label: "Touchstone", checked: steps["kindred_touchstone"]?.defaultChecked?.(actor) ?? true },
          { id: "disciplines", label: "Disciplines", checked: steps["disciplines"]?.defaultChecked?.(actor) ?? true }
        ];
      case "Mage":
        return [
          { id: "nimbus", label: "Nimbus", checked: steps["nimbus"]?.defaultChecked?.(actor) ?? true },
          { id: "dedicated_magical_tool", label: "Dedicated Magical Tool", checked: steps["dedicated_magical_tool"]?.defaultChecked?.(actor) ?? true },
          { id: "arcana", label: "Arcana", checked: steps["arcana"]?.defaultChecked?.(actor) ?? true },
          { id: "rotes", label: "Rotes", checked: steps["rotes"]?.defaultChecked?.(actor) ?? true },
          { id: "obsessions", label: "Obsessions", checked: steps["obsessions"]?.defaultChecked?.(actor) ?? true },
          { id: "praxes", label: "Praxes", checked: steps["praxes"]?.defaultChecked?.(actor) ?? true },
          { id: "resistance_attribute", label: "Resistance Attribute", checked: steps["resistance_attribute"]?.defaultChecked?.(actor) ?? true }
        ];
      case "Changeling":
        return [
          { id: "mien", label: "Mien", checked: steps["mien"]?.defaultChecked?.(actor) ?? true },
          { id: "needle_and_thread", label: "Needle &amp; Thread", checked: steps["needle_and_thread"]?.defaultChecked?.(actor) ?? true },
          { id: "touchstone", label: "Touchstone", checked: steps["touchstone"]?.defaultChecked?.(actor) ?? true },
          { id: "contracts", label: "Contracts", checked: steps["contracts"]?.defaultChecked?.(actor) ?? true }
        ];
      default:
        return [];
    }
  }

static async _onGenerate (actor, html) {
  const form      = html[0].querySelector("form");
  const formData  = new FormData(form);
  const selected  = Array.from(formData.keys());

  ui.notifications.info(`Generating: ${selected.join(", ")}`);

  let position = 0;
  for (const stepName of selected) {
    position++;
    const step = steps[stepName];
    if (!step) {
      ui.notifications.warn(`No step defined for ${stepName}. Skipping.`, position);
      continue;
    } else {
      console.debug(`Processing step: ${stepName}`, position);
    }

    const maximumAttempts = step.maximumAttempts(actor) || 3;
    let attempts = 0;
    let appendage = [];
    let success = false;
    let response = null;
    let data = null;

    while (attempts < maximumAttempts) {
      attempts++;

      response = await hitLLMEndpoint(
        step.prompt(actor),
        actorToCharacterSheet(actor),
        step.tool(actor),
        appendage
      );

      if (response.error) {
        appendage.push({
          role: "assistant",
          content: `Error: ${response.error.message || "An error occurred while generating."}`
        });
        continue;
      }

      const args = response?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
      if (!args) {
        appendage.push({
          role: "assistant",
          content: `No arguments returned for ${stepName}. Please try again.`
        });
        continue;
      }

      data = JSON.parse(args);
      const validationErrors = step.validate(actor, data);
      if (validationErrors.length > 0) {
        appendage.push({
          role: "assistant",
          content: `Validation errors (try again): ${validationErrors.join(", ")}`
        });
        continue;
      }

      success = true;
      break;
    }

    if (success) {
      step.apply(actor, data);
      ui.notifications.info(`Successfully generated ${stepName} for ${actor.name} after ${attempts} attempt(s).`);
    } else {
      ui.notifications.error(`Failed to generate ${stepName} for ${actor.name} after ${maximumAttempts} attempts.`);
    }
  }
}

  static open (actor) {
    return new GenerateCharacterDialog(actor).render(true);
  }
}
