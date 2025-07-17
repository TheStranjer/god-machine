import { demographicsStep } from "./step-definitions/demographics.js";
import { attributesStep } from "./step-definitions/attributes.js";
import { skillsStep } from "./step-definitions/skills.js";
import { skillSpecialtiesStep } from "./step-definitions/skill-specialties.js";
import { meritsStep } from "./step-definitions/merits.js";
import { auspiceAndTribeStep } from "./step-definitions/werewolf/auspice-and-tribe.js";
import { renownStep } from "./step-definitions/werewolf/renown.js";
import { bloodAndBoneStep } from "./step-definitions/werewolf/blood-and-bone.js";
import { urathaTouchstonesStep } from "./step-definitions/werewolf/uratha-touchstones.js";
import { giftsStep } from "./step-definitions/werewolf/gifts.js";
import { ritesStep } from "./step-definitions/werewolf/rites.js";
import { pathAndOrderStep } from "./step-definitions/mage/path-and-order.js";
import { dedicatedMagicalToolStep } from "./step-definitions/mage/dedicated-magical-tool.js";
import { nimbusStep } from "./step-definitions/mage/nimbus.js";
import { arcanaStep } from "./step-definitions/mage/arcana.js";
import { rotesStep } from "./step-definitions/mage/rotes.js";
import { obsessionsStep } from "./step-definitions/mage/obsessions.js";
import { praxesStep } from "./step-definitions/mage/praxes.js";
import { resistanceAttributeStep } from "./step-definitions/mage/resistance-attribute.js";

import { spendWerewolfExperienceStep } from "./step-definitions/werewolf/spend-experience.js";
import { spendMageExperienceStep } from "./step-definitions/mage/spend-experience.js";

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