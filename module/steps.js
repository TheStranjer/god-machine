
import { demographicsStep } from "./step-definitions/demographics.js";
import { attributesStep } from "./step-definitions/attributes.js";
import { skillsStep } from "./step-definitions/skills.js";
import { skillSpecialtiesStep } from "./step-definitions/skill-specialties.js";
import { meritsStep } from "./step-definitions/merits.js";

export const steps = {
  demographics: demographicsStep,
  attributes: attributesStep,
  skills: skillsStep,
  skillSpecialties: skillSpecialtiesStep,
  merits: meritsStep
};