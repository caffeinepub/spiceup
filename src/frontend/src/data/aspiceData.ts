// ASPICE Base Practices and Generic Practices data

export interface BasePractice {
  id: string;
  title: string;
  text: string;
}

export interface GenericPractice {
  id: string;
  title: string;
  text: string;
}

export interface ProcessAttribute {
  id: string;
  name: string;
  practices: GenericPractice[];
}

// ─── BASE PRACTICES ────────────────────────────────────────────

export const BASE_PRACTICES: Record<string, BasePractice[]> = {
  "SWE.1": [
    {
      id: "SWE.1.BP1",
      title: "Specify software requirements",
      text: "Identify and document the software requirements, including functional and non-functional requirements, interfaces to other systems and constraints. NOTE 1: Sources of software requirements include system requirements, system architecture, customer requirements, etc.",
    },
    {
      id: "SWE.1.BP2",
      title: "Structure software requirements",
      text: "Structure the software requirements into software functional areas and allocate to software components. NOTE 1: Structuring may include grouping, prioritizing, and sorting requirements.",
    },
    {
      id: "SWE.1.BP3",
      title: "Analyze software requirements",
      text: "Analyze the specified software requirements for correctness and technical feasibility. NOTE 1: Analysis includes consideration of feasibility, testability, safety, security, consistency, completeness and correctness.",
    },
    {
      id: "SWE.1.BP4",
      title: "Analyze the impact on the operating environment",
      text: "Analyze the impact of the software requirements on the operating environment.",
    },
    {
      id: "SWE.1.BP5",
      title: "Develop verification criteria",
      text: "Develop the verification criteria for the software requirements. NOTE 1: Verification criteria include acceptance criteria and the method of verification.",
    },
    {
      id: "SWE.1.BP6",
      title: "Ensure consistency",
      text: "Ensure consistency between software requirements and system requirements and system architecture. NOTE 1: Consistency is ensured through review or suitable formal methods.",
    },
  ],
  "SWE.2": [
    {
      id: "SWE.2.BP1",
      title: "Develop software architectural design",
      text: "Identify and document the software components and their relationships. NOTE 1: The architectural design describes the decomposition of the software into components and their interfaces.",
    },
    {
      id: "SWE.2.BP2",
      title: "Allocate software requirements",
      text: "Allocate the software requirements to the elements of the software architecture.",
    },
    {
      id: "SWE.2.BP3",
      title: "Define interfaces of software components",
      text: "Identify, specify, and document the interfaces of each software component.",
    },
    {
      id: "SWE.2.BP4",
      title: "Describe dynamic behavior",
      text: "Identify and describe the dynamic behavior of software components and their interaction.",
    },
    {
      id: "SWE.2.BP5",
      title: "Evaluate alternative software architectures",
      text: "Define evaluation criteria and evaluate alternative software architectures. NOTE 1: Evaluation criteria include performance, safety, security, and complexity.",
    },
    {
      id: "SWE.2.BP6",
      title: "Ensure consistency",
      text: "Ensure consistency between the software requirements and the software architectural design.",
    },
  ],
  "SWE.3": [
    {
      id: "SWE.3.BP1",
      title: "Develop detailed design for each software component",
      text: "Develop and document a detailed design for each software component.",
    },
    {
      id: "SWE.3.BP2",
      title: "Define interfaces of software units",
      text: "Identify, specify, and document the interfaces of each software unit.",
    },
    {
      id: "SWE.3.BP3",
      title: "Describe dynamic behavior",
      text: "Identify and describe the dynamic behavior of software units and their interaction.",
    },
    {
      id: "SWE.3.BP4",
      title: "Evaluate detailed design",
      text: "Evaluate the detailed design for correctness, feasibility, and testability.",
    },
    {
      id: "SWE.3.BP5",
      title: "Define and document software units",
      text: "Based on the software detailed design define software units including their interfaces.",
    },
    {
      id: "SWE.3.BP6",
      title: "Ensure consistency",
      text: "Ensure consistency between the software architectural design and the software detailed design.",
    },
  ],
  "SWE.4": [
    {
      id: "SWE.4.BP1",
      title: "Develop software unit verification strategy",
      text: "Develop a strategy for software unit verification including regression strategy and specify criteria for confirmation of results.",
    },
    {
      id: "SWE.4.BP2",
      title: "Develop verification criteria for software units",
      text: "Develop the verification criteria for software units to allow to confirm compliance with the detailed design.",
    },
    {
      id: "SWE.4.BP3",
      title: "Verify software units",
      text: "Verify software units using the defined criteria. NOTE 1: Verification methods include review, simulation, and testing.",
    },
    {
      id: "SWE.4.BP4",
      title: "Determine and document software unit verification results",
      text: "Document verification results including pass/fail criteria and coverage.",
    },
    {
      id: "SWE.4.BP5",
      title: "Ensure consistency",
      text: "Ensure consistency between software units and detailed design.",
    },
  ],
  "SWE.5": [
    {
      id: "SWE.5.BP1",
      title: "Develop software integration strategy",
      text: "Develop an integration strategy for integrating the software components consistent with the software architectural design.",
    },
    {
      id: "SWE.5.BP2",
      title: "Develop software component verification strategy",
      text: "Develop a strategy for software component verification. NOTE 1: This includes regression testing strategy.",
    },
    {
      id: "SWE.5.BP3",
      title: "Develop criteria for software component verification",
      text: "Develop the verification criteria for software components to allow to confirm compliance with the software architectural design.",
    },
    {
      id: "SWE.5.BP4",
      title: "Verify integrated software components",
      text: "Verify integrated software components using the defined criteria.",
    },
    {
      id: "SWE.5.BP5",
      title: "Determine and document software component verification results",
      text: "Document the results from the software component verification activities.",
    },
    {
      id: "SWE.5.BP6",
      title: "Ensure consistency",
      text: "Ensure consistency between the software components and the software architectural design.",
    },
  ],
  "SWE.6": [
    {
      id: "SWE.6.BP1",
      title: "Develop software verification strategy",
      text: "Develop a strategy for software verification with respect to the software requirements.",
    },
    {
      id: "SWE.6.BP2",
      title: "Develop criteria for software verification",
      text: "Develop the criteria for software verification including regression strategy.",
    },
    {
      id: "SWE.6.BP3",
      title: "Verify software",
      text: "Verify the software using the defined verification strategy and criteria.",
    },
    {
      id: "SWE.6.BP4",
      title: "Determine and document results of software verification",
      text: "Document the software verification results.",
    },
    {
      id: "SWE.6.BP5",
      title: "Ensure consistency",
      text: "Ensure consistency between the software and the software requirements.",
    },
  ],
  "SUP.1": [
    {
      id: "SUP.1.BP1",
      title: "Establish quality assurance processes",
      text: "Establish and implement quality assurance processes for all lifecycle activities.",
    },
    {
      id: "SUP.1.BP2",
      title: "Assure quality of work products and activities",
      text: "Assure the quality of work products and activities against specified criteria.",
    },
    {
      id: "SUP.1.BP3",
      title: "Communicate quality assurance results",
      text: "Document and communicate quality assurance results including problems found.",
    },
    {
      id: "SUP.1.BP4",
      title: "Ensure resolution of non-conformances",
      text: "Track non-conformances to resolution.",
    },
  ],
  "SUP.8": [
    {
      id: "SUP.8.BP1",
      title: "Develop a configuration management strategy",
      text: "Develop a strategy for performing configuration management including tools, repositories, and access rights.",
    },
    {
      id: "SUP.8.BP2",
      title: "Identify configuration items",
      text: "Identify the items requiring configuration management.",
    },
    {
      id: "SUP.8.BP3",
      title: "Establish and maintain a configuration management system",
      text: "Establish and maintain a system for managing configuration items.",
    },
    {
      id: "SUP.8.BP4",
      title: "Control changes to configuration items",
      text: "Control all changes to configuration items.",
    },
    {
      id: "SUP.8.BP5",
      title: "Communicate configuration status",
      text: "Communicate the status of configuration items to relevant stakeholders.",
    },
  ],
  "SUP.9": [
    {
      id: "SUP.9.BP1",
      title: "Identify and record problems",
      text: "Identify and record problems and their symptoms.",
    },
    {
      id: "SUP.9.BP2",
      title: "Analyze problems",
      text: "Analyze problems to determine the root cause.",
    },
    {
      id: "SUP.9.BP3",
      title: "Implement problem resolution",
      text: "Implement resolutions to problems.",
    },
    {
      id: "SUP.9.BP4",
      title: "Monitor problem resolution",
      text: "Monitor problems to closure.",
    },
    {
      id: "SUP.9.BP5",
      title: "Communicate problem status",
      text: "Communicate problem status to relevant stakeholders.",
    },
  ],
  "SUP.10": [
    {
      id: "SUP.10.BP1",
      title: "Identify and record change requests",
      text: "Identify and record change requests.",
    },
    {
      id: "SUP.10.BP2",
      title: "Analyze change requests",
      text: "Analyze and evaluate change requests for impact, resource needs, and feasibility.",
    },
    {
      id: "SUP.10.BP3",
      title: "Implement change requests",
      text: "Implement approved change requests.",
    },
    {
      id: "SUP.10.BP4",
      title: "Track change requests",
      text: "Track the status of change requests to closure.",
    },
    {
      id: "SUP.10.BP5",
      title: "Communicate change request status",
      text: "Communicate the status of change requests to relevant stakeholders.",
    },
  ],
  "SUP.11": [
    {
      id: "SUP.11.BP1",
      title: "Identify and collect ML data",
      text: "Identify data requirements and collect relevant machine learning data.",
    },
    {
      id: "SUP.11.BP2",
      title: "Analyze and preprocess ML data",
      text: "Analyze data quality and preprocess data as needed.",
    },
    {
      id: "SUP.11.BP3",
      title: "Manage ML data versions",
      text: "Manage versions of ML datasets.",
    },
    {
      id: "SUP.11.BP4",
      title: "Ensure ML data integrity",
      text: "Ensure data integrity and traceability throughout the ML lifecycle.",
    },
  ],
  "MAN.3": [
    {
      id: "MAN.3.BP1",
      title: "Define the project scope",
      text: "Define the scope of the project and the deliverables to be produced.",
    },
    {
      id: "MAN.3.BP2",
      title: "Define project lifecycle",
      text: "Define the lifecycle for the project.",
    },
    {
      id: "MAN.3.BP3",
      title: "Estimate effort and resources",
      text: "Estimate the effort, resources, and schedule needed.",
    },
    {
      id: "MAN.3.BP4",
      title: "Identify and monitor risks",
      text: "Identify and monitor project risks.",
    },
    {
      id: "MAN.3.BP5",
      title: "Plan and track project activities",
      text: "Plan project activities and track progress against the plan.",
    },
    {
      id: "MAN.3.BP6",
      title: "Communicate project status",
      text: "Communicate project status to relevant stakeholders.",
    },
  ],
};

// ─── GENERIC PRACTICES - LEVEL 2 ──────────────────────────────

export const LEVEL2_ATTRIBUTES: ProcessAttribute[] = [
  {
    id: "PA2.1",
    name: "PA 2.1 — Process Performance Management",
    practices: [
      {
        id: "GP 2.1.1",
        title: "Identify the objectives for the performance of the process",
        text: "Performance objectives are identified and documented. NOTE 1: Objectives may include quality objectives, performance objectives, and resource objectives.",
      },
      {
        id: "GP 2.1.2",
        title:
          "Plan the performance of the process to fulfil the identified objectives",
        text: "The performance of the process is planned to meet the identified objectives.",
      },
      {
        id: "GP 2.1.3",
        title: "Monitor the performance of the process against the plans",
        text: "The performance of the process is monitored against the plan and deviations from the plan are identified.",
      },
      {
        id: "GP 2.1.4",
        title: "Adjust the performance of the process",
        text: "Actions are taken to correct deviations from the plan.",
      },
      {
        id: "GP 2.1.5",
        title:
          "Define responsibilities and authorities for performing the process",
        text: "Responsibilities and authorities are defined.",
      },
      {
        id: "GP 2.1.6",
        title: "Identify and make available resources to perform the process",
        text: "Resources including human resources with defined skills are identified and made available.",
      },
    ],
  },
  {
    id: "PA2.2",
    name: "PA 2.2 — Work Product Management",
    practices: [
      {
        id: "GP 2.2.1",
        title: "Define the requirements for the work products",
        text: "Requirements for the work products including their content and quality criteria are defined.",
      },
      {
        id: "GP 2.2.2",
        title:
          "Define the requirements for documentation and control of the work products",
        text: "Requirements for documentation and control of the work products are defined.",
      },
      {
        id: "GP 2.2.3",
        title: "Identify, document and control the work products",
        text: "Work products are identified, documented and controlled.",
      },
      {
        id: "GP 2.2.4",
        title:
          "Review and adjust work products to meet the defined requirements",
        text: "Work products are reviewed and adjusted to meet requirements.",
      },
    ],
  },
];

// ─── GENERIC PRACTICES - LEVEL 3 ──────────────────────────────

export const LEVEL3_ATTRIBUTES: ProcessAttribute[] = [
  {
    id: "PA3.1",
    name: "PA 3.1 — Process Definition",
    practices: [
      {
        id: "GP 3.1.1",
        title:
          "Define the standard process that supports the deployment of the defined process",
        text: "A standard process is defined that supports the deployment.",
      },
      {
        id: "GP 3.1.2",
        title:
          "Determine the sequence and interaction of the standard process with other processes",
        text: "The sequence and interaction with other processes is determined.",
      },
      {
        id: "GP 3.1.3",
        title:
          "Identify the roles and competencies for performing the standard process",
        text: "Roles and required competencies are identified.",
      },
      {
        id: "GP 3.1.4",
        title:
          "Identify the required infrastructure and work environment for performing the standard process",
        text: "Required infrastructure and work environment are identified.",
      },
    ],
  },
  {
    id: "PA3.2",
    name: "PA 3.2 — Process Deployment",
    practices: [
      {
        id: "GP 3.2.1",
        title:
          "Deploy a defined process that satisfies the context specific requirements",
        text: "A defined process is deployed that satisfies context requirements.",
      },
      {
        id: "GP 3.2.2",
        title:
          "Assign and communicate roles, responsibilities and authorities for performing the defined process",
        text: "Roles, responsibilities and authorities are assigned and communicated.",
      },
      {
        id: "GP 3.2.3",
        title:
          "Ensure necessary competencies for performing the defined process",
        text: "Necessary competencies for the defined process are ensured.",
      },
      {
        id: "GP 3.2.4",
        title:
          "Provide resources and information to support the performance of the defined process",
        text: "Resources and information are provided to support performance.",
      },
    ],
  },
];

// ─── PROCESS GROUP DEFINITIONS ─────────────────────────────────

export const PROCESS_GROUPS: Array<{
  id: string;
  name: string;
  processes: Array<{ id: string; name: string }>;
}> = [
  {
    id: "SYS",
    name: "SYS Process Group",
    processes: [
      { id: "SYS.1", name: "Requirements Elicitation" },
      { id: "SYS.2", name: "System Requirements Analysis" },
      { id: "SYS.3", name: "System Architectural Design" },
      { id: "SYS.4", name: "System Integration and Integration Verification" },
      { id: "SYS.5", name: "System Qualification Verification" },
    ],
  },
  {
    id: "SWE",
    name: "SWE Process Group",
    processes: [
      { id: "SWE.1", name: "Software Requirements Analysis" },
      { id: "SWE.2", name: "Software Architectural Design" },
      { id: "SWE.3", name: "Software Detailed Design and Unit Construction" },
      { id: "SWE.4", name: "Software Unit Verification" },
      {
        id: "SWE.5",
        name: "Software Component Verification and Integration Verification",
      },
      { id: "SWE.6", name: "Software Verification" },
    ],
  },
  {
    id: "SUP",
    name: "SUP Process Group",
    processes: [
      { id: "SUP.1", name: "Quality Assurance" },
      { id: "SUP.8", name: "Configuration Management" },
      { id: "SUP.9", name: "Problem Resolution Management" },
      { id: "SUP.10", name: "Change Request Management" },
      { id: "SUP.11", name: "Machine Learning Data Management" },
    ],
  },
  {
    id: "MAN",
    name: "MAN Process Group",
    processes: [{ id: "MAN.3", name: "Project Management" }],
  },
  {
    id: "ACQ",
    name: "ACQ Process Group",
    processes: [{ id: "ACQ.4", name: "Supplier Monitoring" }],
  },
  {
    id: "VAL",
    name: "VAL Process Group",
    processes: [{ id: "VAL.1", name: "Validation" }],
  },
  {
    id: "MLE",
    name: "MLE Process Group",
    processes: [{ id: "MLE.1", name: "Machine Learning Engineering" }],
  },
  {
    id: "HWE",
    name: "HWE Process Group",
    processes: [{ id: "HWE.1", name: "Hardware Engineering" }],
  },
  {
    id: "PIM",
    name: "PIM Process Group",
    processes: [{ id: "PIM.3", name: "Process Improvement" }],
  },
  {
    id: "REU",
    name: "REU Process Group",
    processes: [{ id: "REU.2", name: "Reuse Program Management" }],
  },
];

export const DEFAULT_ENABLED_GROUPS = ["SWE", "SUP", "MAN"];
