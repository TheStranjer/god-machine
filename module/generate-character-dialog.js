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

  static demographicsCheckedDefault (actor) { return true; }
  static attributesCheckedDefault (actor) { return true; }
  static skillsCheckedDefault (actor) { return true; }
  static skillSpecialtiesCheckedDefault (actor) { return true; }
  static meritsCheckedDefault (actor) { return true; }

  static buildContent (actor) {
    const baseSections = [
      { id: "demographics", label: "Demographics", checked: this.demographicsCheckedDefault(actor) },
      { id: "attributes", label: "Attributes", checked: this.attributesCheckedDefault(actor) },
      { id: "skills", label: "Skills", checked: this.skillsCheckedDefault(actor) },
      { id: "skillSpecialties", label: "Skill Specialties", checked: this.skillSpecialtiesCheckedDefault(actor) },
      { id: "merits", label: "Merits", checked: this.meritsCheckedDefault(actor) }
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
          { id: "renown", label: "Renown", checked: true },
          { id: "blood_and_bone", label: "Blood &amp; Bone", checked: true },
          { id: "uratha_touchstones", label: "Touchstones", checked: true },
          { id: "gifts", label: "Gifts", checked: true },
          { id: "rites", label: "Rites", checked: true }
        ];
      case "Vampire":
        return [
          { id: "masks_and_dirges", label: "Masks &amp; Dirges", checked: true },
          { id: "kindred_touchstone", label: "Touchstone", checked: true },
          { id: "disciplines", label: "Disciplines", checked: true }
        ];
      case "Mage":
        return [
          { id: "nimbus", label: "Nimbus", checked: true },
          { id: "dedicated_magical_tool", label: "Dedicated Magical Tool", checked: true },
          { id: "arcana", label: "Arcana", checked: true },
          { id: "rotes", label: "Rotes", checked: true },
          { id: "obsessions", label: "Obsessions", checked: true },
          { id: "praxes", label: "Praxes", checked: true },
          { id: "resistance_attribute", label: "Resistance Attribute", checked: true }
        ];
      case "Changeling":
        return [
          { id: "mien", label: "Mien", checked: true },
          { id: "needle_and_thread", label: "Needle &amp; Thread", checked: true },
          { id: "touchstone", label: "Touchstone", checked: true },
          { id: "contracts", label: "Contracts", checked: true }
        ];
      default:
        return [];
    }
  }

  static _onGenerate (actor, html) {
    const form = html[0].querySelector("form");
    const formData = new FormData(form);
    const selected = Array.from(formData.keys());

    // Replace with your call to the LLM agent
    console.debug(`Generate requested for ${actor.name}:`, selected);
    ui.notifications.info(`Generating: ${selected.join(", ")}`);

    // TODO: integrate with your backend
  }

  static open (actor) {
    return new GenerateCharacterDialog(actor).render(true);
  }
}
