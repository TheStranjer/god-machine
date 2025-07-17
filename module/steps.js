
import { demographicsStep } from "./step-definitions/demographics.js";
import { attributesStep } from "./step-definitions/attributes.js";
import { skillsStep } from "./step-definitions/skills.js";
import { skillSpecialtiesStep } from "./step-definitions/skill-specialties.js";
import { meritsStep } from "./step-definitions/merits.js";
import { auspiceAndTribeStep } from "./step-definitions/auspice-and-tribe.js";
import { renownStep } from "./step-definitions/renown.js";
import { bloodAndBoneStep } from "./step-definitions/blood-and-bone.js";
import { urathaTouchstonesStep } from "./step-definitions/uratha-touchstones.js";
import { giftsStep } from "./step-definitions/gifts.js";
import { ritesStep } from "./step-definitions/rites.js";
import { pathAndOrderStep } from "./step-definitions/path-and-order.js";
import { dedicatedMagicalToolStep } from "./step-definitions/dedicated-magical-tool.js";
import { nimbusStep } from "./step-definitions/nimbus.js";
import { arcanaStep } from "./step-definitions/arcana.js";
import { rotesStep } from "./step-definitions/rotes.js";
import { obsessionsStep } from "./step-definitions/obsessions.js";
import { praxesStep } from "./step-definitions/praxes.js";
import { resistanceAttributeStep } from "./step-definitions/resistance-attribute.js";

import { spendWerewolfExperienceStep } from "./step-definitions/spend-experience/werewolf.js";
import { spendMageExperienceStep } from "./step-definitions/spend-experience/mage.js";

export const steps = {
  demographics: demographicsStep,
  attributes: attributesStep,
  skills: skillsStep,
  skillSpecialties: skillSpecialtiesStep,
  merits: meritsStep,
  auspiceAndTribe: auspiceAndTribeStep,
  renown: renownStep,
  bloodAndBone: bloodAndBoneStep,
  urathaTouchstones: urathaTouchstonesStep,
  gifts: giftsStep,
  rites: ritesStep,
  pathAndOrder: pathAndOrderStep,
  nimbus: nimbusStep,
  dedicatedMagicalTool: dedicatedMagicalToolStep,
  arcana: arcanaStep,
  rotes: rotesStep,
  obsessions: obsessionsStep,
  praxes: praxesStep,
  resistanceAttribute: resistanceAttributeStep,
  spendExperienceStep: (actor) => {
    switch (actor.system.characterType) {
      case "Werewolf":
        return spendWerewolfExperienceStep;
      case "Mage":
        return spendMageExperienceStep;
    }
  }
};
