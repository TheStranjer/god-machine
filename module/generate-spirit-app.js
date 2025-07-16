import { hitLLMEndpoint } from "./llm-interface.js";
import { generateSpiritStep, rankTable } from "./step-definitions/generate-spirit.js";
import { actorToSpiritSheet } from "./utils/actor-to-spirit-sheet.js";

export class GenerateSpiritApp extends FormApplication {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "generate-spirit-app",
      classes: ["mta", "generate-spirit"],
      title: "Generate Spirit",
      template: "modules/god-machine/templates/generate-spirit.html",
      width: 550,
      height: "auto",
      closeOnSubmit: false,
      submitOnChange: false
    });
  }

  constructor(actor) {
    super();
    this.actor = actor;
  }

  getData() {
    const actor = this.actor;
    const ctx = {
      characterName: actor?.name || "New Spirit",
      rankOptions: rankTable.map(r => ({value: r.rank, label: `Rank ${r.rank} (${r.title})`})), // rankTable from generate-spirit.js, assume imported or shared
      currentRank: actor.system.eph_general.rank.value,
      sections: [
        { id: "generateSpirit", label: "Generate Spirit", checked: generateSpiritStep.defaultChecked(actor) ?? true }
      ]
    };
    return ctx;
  }

  activateListeners(html) {
    super.activateListeners(html);
  }

  _setStatus(stepId, status) {
    const row = this.element.find(`.step-row[data-step="${stepId}"]`);
    row.removeClass("step-queued step-current step-done step-failed").addClass(`step-${status}`);
  }

  _queueAll(stepIds) {
    stepIds.forEach(id => this._setStatus(id, "queued"));
  }

  async _updateObject(event, formData) {
    event.preventDefault();
    const html = this.element;
    const checked = Object.keys(formData)
      .filter(key => key.endsWith("-step") && formData[key] === true)
      .map(key => key.replace(/-step$/, ""));

    const rank = parseInt(formData.rank, 10);

    if (!Number.isInteger(rank) || rank < 0 || rank > 5) {
      ui.notifications.error("Invalid Rank selected.");
      return;
    }

    await this.actor.update({"system.eph_general.rank.value": rank});

    html.find('input, select').prop('disabled', true);

    const selected = checked;

    const generateBtn = html.find(".generate-btn");
    generateBtn.prop("disabled", true);
    this._queueAll(selected);

    ui.notifications.info(`Generating Spirit with Rank ${rank}.`);

    let success = false;
    for (const stepName of selected) {
      const step = generateSpiritStep;
      this._setStatus(stepName, "current");

      const maximumAttempts = step.maximumAttempts(this.actor) || 3;
      let attempts = 0;
      let appendage = [];
      let response = null;
      let data = null;

      while (attempts < maximumAttempts) {
        attempts++;

        response = await hitLLMEndpoint(
          step.prompt(this.actor),
          actorToSpiritSheet(this.actor),
          step.tool(this.actor),
          appendage
        );

        if (response.error) {
          appendage.push({ role: "assistant", content: `Error: ${response.error.message || "An error occurred while generating."}` });
          continue;
        }

        const args = response?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
        appendage.push({ role: "assistant", content: `Attempt ${attempts} of ${maximumAttempts}: ${args || "No content returned."}` });

        if (!args) {
          appendage.push({ role: "user", content: "No arguments returned from the LLM. Please try again." });
          continue;
        }

        try {
          data = JSON.parse(args);
        } catch (e) {
          appendage.push({ role: "user", content: "Invalid JSON returned. Please try again." });
          continue;
        }

        const validationErrors = step.validate(this.actor, data);
        if (validationErrors.length > 0) {
          appendage.push({ role: "user", content: `Validation errors (try again): ${validationErrors.join(", ")}` });
          continue;
        }

        success = true;
        break;
      }

      if (success) {
        await step.apply(this.actor, data);
        this._setStatus(stepName, "done");
        ui.notifications.info(`Generated Spirit after ${attempts} attempt(s).`);
      } else {
        this._setStatus(stepName, "failed");
        ui.notifications.error(`Failed to generate Spirit after ${maximumAttempts} attempts.`);
        console.error(`Failed to generate Spirit.`, {actor: this.actor, attempts, maximumAttempts, appendage});
      }
    }

    html.find('input, select').prop('disabled', false);
    generateBtn.prop("disabled", false);
  }
}