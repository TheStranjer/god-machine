
import { demographicsStep } from "./step-definitions/demographics.js";
import { attributesStep } from "./step-definitions/attributes.js";
import { skillsStep } from "./step-definitions/skills.js";

export const steps = {
  demographics: demographicsStep,
  attributes: attributesStep,
  skills: skillsStep,
};