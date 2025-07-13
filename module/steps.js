
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
  rites: ritesStep
};
