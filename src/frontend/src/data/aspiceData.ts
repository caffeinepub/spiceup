// ASPICE Base Practices and Generic Practices data
// Full verbatim text from Automotive SPICE standard

export interface BasePractice {
  id: string;
  title: string;
  text: string; // main requirement text ONLY - no Note lines
  notes?: string[]; // array of note strings without "Note N:" prefix
}

export interface GenericPractice {
  id: string;
  title: string;
  text: string;
  notes?: string[];
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
      text: "Use the system requirements and the system architecture to identify and document the functional and non-functional requirements for the software according to defined characteristics for requirements.",
      notes: [
        "Characteristics of requirements are defined in standards such as ISO IEEE 29148, ISO 26262-8:2018, or the INCOSE Guide for Writing Requirements.",
        "Examples for defined characteristics of requirements shared by technical standards are verifiability (i.e., verification criteria being inherent in the requirements text), unambiguity/comprehensibility, freedom from design and implementation, and not contradicting any other requirement.",
        "In case of software-only development, the system requirements and the system architecture refer to a given operating environment. In that case, stakeholder requirements can be used as the basis for identifying the required functions and capabilities of the software.",
        "The hardware-software-interface (HSI) definition puts in context hardware and therefore it is an interface decision at the system design level. If such a HSI exists, then it may provide input to software requirements.",
      ],
    },
    {
      id: "SWE.1.BP2",
      title: "Structure software requirements",
      text: "Structure and prioritize the software requirements.",
      notes: [
        "Examples for structuring criteria can be grouping (e.g., by functionality) or expressing product variants.",
        "Prioritization can be done according to project or stakeholder needs via e.g., definition of release scopes. Refer to SPL.2.BP1.",
      ],
    },
    {
      id: "SWE.1.BP3",
      title: "Analyze software requirements",
      text: "Analyze the specified software requirements including their interdependencies to ensure correctness, technical feasibility, and to support project management regarding project estimates.",
      notes: [
        "See MAN.3.BP3 for project feasibility and MAN.3.BP5 for project estimates.",
        "Technical feasibility can be evaluated based on e.g., platform or product line, or by prototyping.",
      ],
    },
    {
      id: "SWE.1.BP4",
      title: "Analyze the impact on the operating environment",
      text: "Analyze the impact that the software requirements will have on elements in the operating environment.",
    },
    {
      id: "SWE.1.BP5",
      title: "Ensure consistency and establish bidirectional traceability",
      text: "Ensure consistency and establish bidirectional traceability between software requirements and system architecture. Ensure consistency and establish bidirectional traceability between software requirements and system requirements.",
      notes: [
        "Redundant traceability is not intended.",
        "There may be non-functional system requirements that the software requirements do not trace to. Examples are process requirements or requirements related to later software product lifecycle phases such as incident handling. Such requirements are still subject to verification.",
        "Bidirectional traceability supports consistency, and facilitates impact analysis of change requests, and demonstration of verification coverage. Traceability alone, e.g., the existence of links, does not necessarily mean that the information is consistent with each other.",
        "In case of software development only, the system requirements and system architecture refer to a given operating environment. In that case, consistency and bidirectional traceability can be ensured between stakeholder requirements and software requirements.",
      ],
    },
    {
      id: "SWE.1.BP6",
      title:
        "Communicate agreed software requirements and impact on the operating environment",
      text: "Communicate the agreed software requirements, and the results of the analysis of impact on the operating environment, to all affected parties.",
    },
  ],

  "SWE.2": [
    {
      id: "SWE.2.BP1",
      title: "Specify static aspects of the software architecture",
      text: "Specify and document the static aspects of the software architecture with respect to the functional and non-functional software requirements, including external interfaces and a defined set of software components with their interfaces and relationships.",
      notes: [
        "The hardware-software-interface (HSI) definition puts in context the hardware design and therefore is an aspect of system design (SYS.3).",
      ],
    },
    {
      id: "SWE.2.BP2",
      title: "Specify dynamic aspects of the software architecture",
      text: "Specify and document the dynamic aspects of the software architecture with respect to the functional and non-functional software requirements, including the behavior of the software components and their interaction in different software modes, and concurrency aspects.",
      notes: [
        "Examples for concurrency aspects are application-relevant interrupt handling, preemptive processing, multi-threading.",
        "Examples for behavioral descriptions are natural language or semi-formal notation (e.g., SysML, UML).",
      ],
    },
    {
      id: "SWE.2.BP3",
      title: "Analyze software architecture",
      text: "Analyze the software architecture regarding relevant technical design aspects and to support project management regarding project estimates. Document a rationale for the software architectural design decision.",
      notes: [
        "See MAN.3.BP3 for project feasibility and MAN.3.BP5 for project estimates.",
        "The analysis may include the suitability of pre-existing software components for the current application.",
        "Examples of methods suitable for analyzing technical aspects are prototypes, simulations, qualitative analyses.",
        "Examples of technical aspects are functionality, timings, and resource consumption (e.g., ROM, RAM, external / internal EEPROM or Data Flash or CPU load).",
        "Design rationales can include arguments such as proven-in-use, reuse of a software framework or software product line, a make-or-buy decision, or found in an evolutionary way (e.g., set-based design).",
      ],
    },
    {
      id: "SWE.2.BP4",
      title: "Ensure consistency and establish bidirectional traceability",
      text: "Ensure consistency and establish bidirectional traceability between the software architecture and the software requirements.",
      notes: [
        "There may be non-functional software requirements that the software architectural design does not trace to. Examples are development process requirements. Such requirements are still subject to verification.",
        "Bidirectional traceability supports consistency, and facilitates impact analysis of change requests, and demonstration of verification coverage. Traceability alone, e.g., the existence of links, does not necessarily mean that the information is consistent with each other.",
      ],
    },
    {
      id: "SWE.2.BP5",
      title: "Communicate agreed software architecture",
      text: "Communicate the agreed software architecture to all affected parties.",
    },
  ],

  "SWE.3": [
    {
      id: "SWE.3.BP1",
      title: "Specify the static aspects of the detailed design",
      text: "For each software component specify the behavior of its software units, their static structure and relationships, their interfaces including valid data value ranges for inputs and outputs (from the application domain perspective), and physical or measurement units applicable to inputs and outputs (from the application domain perspective).",
      notes: [
        "The boundary of a software unit is independent from the software unit's representation in the source code, code file structure, or model-based implementation, respectively. It is rather driven by the semantics of the application domain perspective. Therefore, a software unit may be, at the code level, represented by a single subroutine or a set of subroutines.",
        "Examples of valid data value ranges with applicable physical units from the application domain perspective are '0..200 [m/s]', '0..3.8 [A]' or '1..100 [N]'.",
        "Examples of a measurement unit are '%' or '‰'.",
        "A counter is an example of a parameter, or a return value, to which neither a physical nor a measurement unit is applicable.",
        "The hardware-software-interface (HSI) definition puts in context the hardware design and therefore is an aspect of system design (SYS.3).",
      ],
    },
    {
      id: "SWE.3.BP2",
      title: "Specify dynamic aspects of the detailed design",
      text: "Specify and document the dynamic aspects of the detailed design with respect to the software architecture, including the interactions between relevant software units to fulfill the component's dynamic behavior.",
      notes: [
        "Examples for behavioral descriptions are natural language or semi-formal notation (e.g., SysML, UML).",
      ],
    },
    {
      id: "SWE.3.BP3",
      title: "Develop software units",
      text: "Develop and document the software units consistent with the detailed design, and according to coding principles.",
      notes: [
        "Examples for coding principles at capability level 1 are not to use implicit type conversions, only one entry and one exit point in subroutines, and range checks (design-by-contract, defensive programming). Further examples see e.g., ISO 26262-6 clause 8.4.5 together with table 6.",
      ],
    },
    {
      id: "SWE.3.BP4",
      title: "Ensure consistency and establish bidirectional traceability",
      text: "Ensure consistency and establish bidirectional traceability between the software detailed design and the software architecture. Ensure consistency and establish bidirectional traceability between the developed software units and the software detailed design. Ensure consistency and establish traceability between the software detailed design and the software requirements.",
      notes: [
        "Redundancy should be avoided by establishing a combination of these approaches.",
        "Examples for tracing a software unit in the detailed design to a software requirement directly are communication matrices or basis software aspects such as a list of diagnosis identifiers inherent in an Autosar configuration.",
        "Bidirectional traceability supports consistency, and facilitates impact analysis of change requests, and demonstration of verification coverage. Traceability alone, e.g., the existence of links, does not necessarily mean that the information is consistent with each other.",
      ],
    },
    {
      id: "SWE.3.BP5",
      title:
        "Communicate agreed software detailed design and developed software units",
      text: "Communicate the agreed software detailed design and developed software units to all affected parties.",
    },
  ],

  "SWE.4": [
    {
      id: "SWE.4.BP1",
      title: "Specify software unit verification measures",
      text: "Specify verification measures for each software unit defined in the software detailed design, including pass/fail criteria for verification measures, entry and exit criteria for verification measures, and the required verification infrastructure.",
      notes: [
        "Examples for unit verification measures are static analysis, code reviews, and unit testing.",
        "Static analysis can be done based on MISRA rulesets and other coding standards.",
      ],
    },
    {
      id: "SWE.4.BP2",
      title: "Select software unit verification measures",
      text: "Document the selection of verification measures considering selection criteria including criteria for regression verification. The documented selection of verification measures shall have sufficient coverage according to the release scope.",
    },
    {
      id: "SWE.4.BP3",
      title: "Verify software units",
      text: "Perform software unit verification using the selected verification measures. Record the verification results including pass/fail status and corresponding verification measure data.",
      notes: [
        "See SUP.9 for handling of verification results that deviate from expected results.",
      ],
    },
    {
      id: "SWE.4.BP4",
      title: "Ensure consistency and establish bidirectional traceability",
      text: "Ensure consistency and establish bidirectional traceability between verification measures and the software units defined in the detailed design. Establish bidirectional traceability between the verification results and the verification measures.",
      notes: [
        "Bidirectional traceability supports consistency, and facilitates impact analysis of change requests, and demonstration of verification coverage. Traceability alone, e.g., the existence of links, does not necessarily mean that the information is consistent with each other.",
      ],
    },
    {
      id: "SWE.4.BP5",
      title: "Summarize and communicate results",
      text: "Summarize the results of software unit verification and communicate them to all affected parties.",
      notes: [
        "Providing all necessary information from the test case execution in a summary enables other parties to judge the consequences.",
      ],
    },
  ],

  "SWE.5": [
    {
      id: "SWE.5.BP1",
      title: "Specify software integration verification measures",
      text: "Specify verification measures, based on a defined sequence and preconditions for the integration of software elements, against the defined static and dynamic aspects of the software architecture, including techniques for the verification measures, pass/fail criteria for verification measures, entry and exit criteria for verification measures, and the required verification infrastructure and environment setup.",
      notes: [
        "Examples on which the software integration verification measures may focus on are the correct dataflow and dynamic interaction between software components together with their timing dependencies, the correct interpretation of data by all software components using an interface, and the compliance to resource consumption objectives.",
        "The software integration verification measure may be supported by using hardware debug interfaces or simulation environments (e.g., Software-in-the-Loop-Simulation).",
      ],
    },
    {
      id: "SWE.5.BP2",
      title:
        "Specify verification measures for verifying software component behavior",
      text: "Specify verification measures for software component verification against the defined software components' behavior and their interfaces in the software architecture, including techniques for the verification measures, entry and exit criteria for verification measures, pass/fail criteria for verification measures, and the required verification infrastructure and environment setup.",
      notes: [
        "Verification measures are related to software components but not to the software units since software unit verification is addressed in the process SWE.4 Software Unit Verification.",
      ],
    },
    {
      id: "SWE.5.BP3",
      title: "Select verification measures",
      text: "Document the selection of integration verification measures for each integration step considering selection criteria including criteria for regression verification. The documented selection of verification measures shall have sufficient coverage according to the release scope.",
      notes: [
        "Examples for selection criteria can be the need for continuous integration/continuous development regression verification (due to e.g., changes to the software architectural or detailed design), or the intended use of the delivered product release (e.g., test bench, test track, public road etc.).",
      ],
    },
    {
      id: "SWE.5.BP4",
      title: "Integrate software elements and perform integration verification",
      text: "Integrate the software elements until the software is fully integrated according to the specified interfaces and interactions between the Software elements, and according to the defined sequence and defined preconditions. Perform the selected integration verification measures. Record the verification measure data including pass/fail status and corresponding verification measure data.",
      notes: [
        "Examples for preconditions for starting software integration are qualification of pre-existing software components, off-the-shelf software components, open-source-software, or auto-code generated software.",
        "Defined preconditions may allow e.g., big-bang-integration of all software components, continuous integration, as well as stepwise integration (e.g., across software units and/or software components up to the fully integrated software) with accompanying verification measures.",
        "See SUP.9 for handling deviations of verification results deviate expected results.",
      ],
    },
    {
      id: "SWE.5.BP5",
      title: "Perform software component verification",
      text: "Perform the selected verification measures for verifying software component behavior. Record the verification results including pass/fail status and corresponding verification measure data.",
      notes: [
        "See SUP.9 for handling verification results that deviate from expected results.",
      ],
    },
    {
      id: "SWE.5.BP6",
      title: "Ensure consistency and establish bidirectional traceability",
      text: "Ensure consistency and establish bidirectional traceability between verification measures and the static and dynamic aspects of the software architecture and detailed design. Establish bidirectional traceability between verification results and verification measures.",
      notes: [
        "Bidirectional traceability supports consistency, and facilitates impact analysis of change requests, and demonstration of verification coverage. Traceability alone, e.g., the existence of links, does not necessarily mean that the information is consistent with each other.",
      ],
    },
    {
      id: "SWE.5.BP7",
      title: "Summarize and communicate results",
      text: "Summarize the software component verification and the software integration verification results and communicate them to all affected parties.",
      notes: [
        "Providing all necessary information from the test case execution in a summary enables other parties to judge the consequences.",
      ],
    },
  ],

  "SWE.6": [
    {
      id: "SWE.6.BP1",
      title: "Specify verification measures for software verification",
      text: "Specify the verification measures for software verification suitable to provide evidence for compliance of the integrated software with the functional and non-functional information in the software requirements, including techniques for the verification measures, pass/fail criteria for verification measures, a definition of entry and exit criteria for the verification measures, necessary sequence of verification measures, and the required verification infrastructure and environment setup.",
      notes: [
        "The selection of appropriate techniques for verification measures may depend on the content of the respective software requirement (e.g., boundary values and equivalence classes for data range-oriented requirements, positive/sunny-day-test vs. negative testing such as fault injection), or on requirements-based testing vs. 'error guessing based on knowledge or experience'.",
      ],
    },
    {
      id: "SWE.6.BP2",
      title: "Select verification measures",
      text: "Document the selection of verification measures considering selection criteria including criteria for regression verification. The documented selection of verification measures shall have sufficient coverage according to the release scope.",
      notes: [
        "Examples for selection criteria can be prioritization of requirements, continuous development, the need for regression verification (due to e.g., changes to the software requirements), or the intended use of the delivered product release (test bench, test track, public road etc.).",
      ],
    },
    {
      id: "SWE.6.BP3",
      title: "Verify the integrated software",
      text: "Perform the verification of the integrated software using the selected verification measures. Record the verification results including pass/fail status and corresponding verification measure data.",
      notes: [
        "See SUP.9 for handling verification results that deviate from expected results.",
      ],
    },
    {
      id: "SWE.6.BP4",
      title: "Ensure consistency and establish bidirectional traceability",
      text: "Ensure consistency and establish bidirectional traceability between verification measures and software requirements. Establish bidirectional traceability between verification results and verification measures.",
      notes: [
        "Bidirectional traceability supports consistency, and facilitates impact analysis of change requests, and demonstration of verification coverage. Traceability alone, e.g., the existence of links, does not necessarily mean that the information is consistent with each other.",
      ],
    },
    {
      id: "SWE.6.BP5",
      title: "Summarize and communicate results",
      text: "Summarize the software verification results and communicate them to all affected parties.",
      notes: [
        "Providing all necessary information from the test case execution in a summary enables other parties to judge the consequences.",
      ],
    },
  ],

  "SUP.1": [
    {
      id: "SUP.1.BP1",
      title: "Ensure independence of quality assurance",
      text: "Ensure that quality assurance is performed independently and objectively without conflicts of interest.",
      notes: [
        "Possible inputs for evaluating the independence may be assignment to financial and/or organizational structure as well as responsibility for processes that are subject to quality assurance (no self-monitoring).",
      ],
    },
    {
      id: "SUP.1.BP2",
      title: "Define criteria for quality assurance",
      text: "Define quality criteria for work products as well as for process tasks and their performance.",
      notes: [
        "Quality criteria may consider internal and external inputs such as customer requirements, standards, milestones, etc.",
      ],
    },
    {
      id: "SUP.1.BP3",
      title: "Assure quality of work products",
      text: "Identify work products subject to quality assurance according to the quality criteria. Perform appropriate activities to evaluate the work products against the defined quality criteria and document the results.",
      notes: [
        "Quality assurance activities may include reviews, problem analysis and lessons learned that improve the work products for further use.",
      ],
    },
    {
      id: "SUP.1.BP4",
      title: "Assure quality of process activities",
      text: "Identify processes subject to quality assurance according to the quality criteria. Perform appropriate activities to evaluate the processes against their defined quality criteria and associated target values and document the results.",
      notes: [
        "Quality assurance activities may include process assessments, problem analysis, regular check of methods, tools, and the adherence to defined processes, and consideration of lessons learned.",
      ],
    },
    {
      id: "SUP.1.BP5",
      title:
        "Summarize and communicate quality assurance activities and results",
      text: "Regularly report performance, non-conformances, and trends of quality assurance activities to all affected parties.",
    },
    {
      id: "SUP.1.BP6",
      title: "Ensure resolution of non-conformances",
      text: "Analyze, track, correct, resolve, and further prevent non-conformances found in quality assurance activities.",
      notes: [
        "Non-conformances detected in work products may be entered into the problem resolution management process (SUP.9).",
        "Non-conformances detected in the process definition or implementation may be entered into a process improvement process (PIM.3).",
      ],
    },
    {
      id: "SUP.1.BP7",
      title: "Escalate non-conformances",
      text: "Escalate relevant non-conformances to appropriate levels of management and other relevant stakeholders to facilitate their resolution.",
      notes: [
        "The decision whether to escalate non-conformances may be based on criteria such as delay of resolution, urgency, and risk.",
      ],
    },
  ],

  "SUP.8": [
    {
      id: "SUP.8.BP1",
      title: "Identify configuration items",
      text: "Define selection criteria for identifying relevant work products to be subject to configuration management. Identify and document configuration items according to the defined selection criteria.",
      notes: [
        "Configuration items are representing work products or group of work products which are subject to configuration management as a single entity.",
        "Configuration items may vary in complexity, size, and type, ranging from an entire system including all system, hardware, and software documentation down to a single element or document.",
        "The selection criteria may be applied to single work products or a group of work products.",
      ],
    },
    {
      id: "SUP.8.BP2",
      title: "Define configuration item properties",
      text: "Define the necessary properties needed for the modification and control of configuration items.",
      notes: [
        "The configuration item properties may be defined for single configuration items or a group of items.",
        "Configuration item properties may include a status model (e.g., Under Work, Tested, Released, etc.), storage location, access rights, etc.",
        "The application of properties may be implemented by attributes of configuration items.",
      ],
    },
    {
      id: "SUP.8.BP3",
      title: "Establish configuration management",
      text: "Establish configuration management mechanisms for control of identified configuration items including the configuration item properties, including mechanisms for controlling parallel modifications of configuration items.",
      notes: [
        "This may include specific mechanisms for different configuration item types, such as branch and merge management, or checkout control.",
      ],
    },
    {
      id: "SUP.8.BP4",
      title: "Control modifications",
      text: "Control modifications using the configuration management mechanisms.",
      notes: [
        "This may include the application of a defined status model for configuration items.",
      ],
    },
    {
      id: "SUP.8.BP5",
      title: "Establish baselines",
      text: "Define and establish baselines for internal purposes, and for external product delivery, for all relevant configuration items.",
    },
    {
      id: "SUP.8.BP6",
      title: "Summarize and communicate configuration status",
      text: "Record, summarize, and communicate the status of configuration items and established baselines to affected parties in order to support the monitoring of progress and status.",
      notes: [
        "Regular communication of the configuration status, e.g., based on a defined status model supports project management, quality activities, and dedicated project phases such as software integration.",
      ],
    },
    {
      id: "SUP.8.BP7",
      title: "Ensure completeness and consistency",
      text: "Ensure that the information about configuration items is correct and complete including configuration item properties. Ensure the completeness and consistency of baselines.",
      notes: [
        "Completeness and consistency of a baseline means that all required configuration items are included and consistent, and have the required status. This can be used to support e.g., project gate approval.",
      ],
    },
    {
      id: "SUP.8.BP8",
      title: "Verify backup and recovery mechanisms availability",
      text: "Verify the availability of appropriate backup and recovery mechanisms for the configuration management including the controlled configuration items. Initiate measures in case of insufficient backup and recovery mechanisms.",
      notes: [
        "Backup and recovery mechanisms may be defined and implemented by organizational units outside the project team. This may include references to corresponding procedures or regulations.",
      ],
    },
  ],

  "SUP.9": [
    {
      id: "SUP.9.BP1",
      title: "Identify and record the problem",
      text: "Each problem is uniquely identified, described and recorded. A status is assigned to each problem to facilitate tracking. Supporting information is provided to reproduce and diagnose the problem.",
      notes: [
        "Problems may relate to e.g., product, resources, or methods.",
        "Example values for the problem status are 'new', 'solved', 'closed', etc.",
        "Supporting information may include e.g., the origin of the problem, how it can be reproduced, environmental information, by whom it has been detected.",
        "Unique identification supports traceability to changes made as needed by the change request management process (SUP.10).",
      ],
    },
    {
      id: "SUP.9.BP2",
      title: "Determine the cause and the impact of the problem",
      text: "Analyze the problem, determine its cause, including common causes if existing, and impact. Involve relevant parties. Categorize the problem.",
      notes: [
        "Problem categorization (e.g., light, medium, severe) may be based on severity, criticality, urgency, etc.",
      ],
    },
    {
      id: "SUP.9.BP3",
      title: "Authorize urgent resolution action",
      text: "Obtain authorization for immediate action if a problem requires an urgent resolution according to the categorization.",
    },
    {
      id: "SUP.9.BP4",
      title: "Raise alert notifications",
      text: "If according to the categorization the problem has a high impact on other systems or other affected parties, an alert notification needs to be raised accordingly.",
    },
    {
      id: "SUP.9.BP5",
      title: "Initiate problem resolution",
      text: "Initiate appropriate actions according to the categorization to resolve the problem long-term, including review of those actions or initiate a change request. This includes synchronization and consistency with short-term urgent resolution actions, if applicable.",
    },
    {
      id: "SUP.9.BP6",
      title: "Track problems to closure",
      text: "Track the status of problems to closure including all related change requests. The closure of problems is accepted by relevant stakeholders.",
    },
    {
      id: "SUP.9.BP7",
      title: "Report the status of problem resolution activities",
      text: "Collect and analyze problem resolution management data, identify trends, and initiate related actions. Regularly report the results of data analysis, the identified trends and the status of problem resolution activities to relevant stakeholders.",
      notes: [
        "Collected data may contain information about where the problems occurred, how and when they were found, what their impacts were, etc.",
      ],
    },
  ],

  "SUP.10": [
    {
      id: "SUP.10.BP1",
      title: "Identify and record the change requests",
      text: "The scope for application of change requests is identified. Each change request is uniquely identified, described, and recorded, including the initiator and reason of the change request. A status is assigned to each change request to facilitate tracking.",
      notes: [
        "Change requests may be used for changes related to e.g., product, process, methods.",
        "Example values for the change request status are 'open', 'under investigation', 'implemented', etc.",
        "The change request handling may differ across the product life cycle e.g., during prototype construction and series development.",
      ],
    },
    {
      id: "SUP.10.BP2",
      title: "Analyze and assess change requests",
      text: "Change requests are analyzed by relevant parties according to analysis criteria. Work products affected by the change request and dependencies to other change requests are determined. The impact of the change requests is assessed.",
      notes: [
        "Examples for analysis criteria are: resource requirements, scheduling issues, risks, benefits, etc.",
      ],
    },
    {
      id: "SUP.10.BP3",
      title: "Approve change requests before implementation",
      text: "Change requests are prioritized and approved for implementation based on analysis results and availability of resources.",
      notes: [
        "A Change Control Board (CCB) is an example mechanism used to approve change requests.",
        "Prioritization of change requests may be done by allocation to releases.",
      ],
    },
    {
      id: "SUP.10.BP4",
      title: "Establish bidirectional traceability",
      text: "Establish bidirectional traceability between change requests and work products affected by the change requests. In case that the change request is initiated by a problem, establish bidirectional traceability between change requests and the corresponding problem reports.",
    },
    {
      id: "SUP.10.BP5",
      title: "Confirm the implementation of change requests",
      text: "The implementation of change requests is confirmed before closure by relevant stakeholders.",
    },
    {
      id: "SUP.10.BP6",
      title: "Track change requests to closure",
      text: "Change requests are tracked to closure. The status of change requests is communicated to all affected parties.",
      notes: [
        "Examples for informing affected parties can be daily standup meetings or tool-supported workflows.",
      ],
    },
  ],

  "SUP.11": [
    {
      id: "SUP.11.BP1",
      title: "Identify and collect ML data",
      text: "Identify data requirements and collect relevant machine learning data for the intended use.",
    },
    {
      id: "SUP.11.BP2",
      title: "Analyze and preprocess ML data",
      text: "Analyze data quality, identify and handle data issues, and preprocess data as needed for use in machine learning.",
    },
    {
      id: "SUP.11.BP3",
      title: "Manage ML data versions",
      text: "Manage versions of ML datasets to enable reproducibility and traceability of machine learning results.",
    },
    {
      id: "SUP.11.BP4",
      title: "Ensure ML data integrity",
      text: "Ensure data integrity and traceability throughout the ML lifecycle including data provenance and lineage.",
    },
  ],

  "MAN.3": [
    {
      id: "MAN.3.BP1",
      title: "Define the scope of work",
      text: "Identify the project's goals, motivation and boundaries.",
    },
    {
      id: "MAN.3.BP2",
      title: "Define project life cycle",
      text: "Define the life cycle for the project, which is appropriate to the scope, context, and complexity of the project. Define a release scope for relevant milestones.",
      notes: [
        "This may include the alignment of the project life cycle with the customer's development process.",
      ],
    },
    {
      id: "MAN.3.BP3",
      title: "Evaluate feasibility of the project",
      text: "Evaluate the feasibility of achieving the goals of the project with respect to time, project estimates, and available resources.",
      notes: [
        "The evaluation of feasibility may consider technical constraints of the project.",
      ],
    },
    {
      id: "MAN.3.BP4",
      title: "Define and monitor work packages",
      text: "Define and monitor work packages and their dependencies according to defined project life cycle and estimations.",
      notes: [
        "The structure and the size of the work packages support an adequate progress monitoring.",
        "Work packages may be organized in a work breakdown structure.",
      ],
    },
    {
      id: "MAN.3.BP5",
      title: "Define and monitor project estimates and resources",
      text: "Define and monitor project estimates of effort and resources based on project's goals, project risks, motivation and boundaries.",
      notes: [
        "Examples of necessary resources are budget, people, product samples, or infrastructure.",
        "Project risks (using MAN.5) may be considered.",
        "Estimations and resources may include engineering, management and supporting processes.",
      ],
    },
    {
      id: "MAN.3.BP6",
      title: "Define and monitor required skills, knowledge, and experience",
      text: "Identify and monitor the required skills, knowledge, and experience for the project in line with the estimates and work packages.",
      notes: [
        "Training, mentoring or coaching of individuals may be applied to resolve deviations from required skills and knowledge.",
      ],
    },
    {
      id: "MAN.3.BP7",
      title: "Define and monitor project interfaces and agreed commitments",
      text: "Identify and agree interfaces of the project with affected stakeholders and monitor agreed commitments. Define an escalation mechanism for commitments that are not fulfilled.",
      notes: [
        "Affected stakeholders may include other projects, organizational units, sub-contractors, and service providers.",
      ],
    },
    {
      id: "MAN.3.BP8",
      title: "Define and monitor project schedule",
      text: "Allocate resources to work packages and schedule each activity of the project. Monitor the performance of activities against schedule.",
    },
    {
      id: "MAN.3.BP9",
      title: "Ensure consistency",
      text: "Regularly adjust estimates, resources, skills, work packages and their dependencies, schedules, plans, interfaces, and commitments for the project to ensure consistency with the scope of work.",
      notes: [
        "This may include the consideration of critical dependencies, that are an input for risk management.",
      ],
    },
    {
      id: "MAN.3.BP10",
      title: "Review and report progress of the project",
      text: "Regularly review and report the status of the project and the fulfillment of work packages against estimated effort and duration to all affected parties. Prevent recurrence of identified problems.",
      notes: [
        "Project reviews may be executed at regular intervals by the management. Project reviews may contribute to identify best practices and lessons learned.",
        "Refer to SUP.9 for resolution of problems.",
      ],
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
        title:
          "Identify the objectives and define a strategy for the performance of the process",
        text: "The scope of the process activities including the management of process performance and the management of work products are determined. Corresponding results to be achieved are determined. Process performance objectives and associated criteria are identified. Assumptions and constraints are considered when identifying the performance objectives. Approach and methodology for the process performance is determined.",
        notes: [
          "Budget targets and delivery dates to the customer, targets for test coverage and process lead time are examples for process performance objectives.",
          "Performance objectives are the basis for planning and monitoring.",
          "A process performance strategy may not necessarily be documented specifically for each process. Elements applicable for multiple processes may be documented jointly, e.g., as part of a common project handbook or in a joint test strategy.",
        ],
      },
      {
        id: "GP 2.1.2",
        title: "Plan the performance of the process",
        text: "The planning for the performance of the process is established according to the defined objectives, criteria, and strategy. Process activities and work packages are defined. Estimates for work packages are identified using appropriate methods.",
        notes: ["Schedule and milestones are defined."],
      },
      {
        id: "GP 2.1.3",
        title: "Determine resource needs",
        text: "The required amount of human resources, and experience, knowledge and skill needs for the process performance are determined based on the planning. The needs for physical and material resources are determined based on the planning. Required responsibilities and authorities to perform the process, and to manage the corresponding work products are determined.",
        notes: [
          "Physical and material resources may include equipment, laboratories, materials, tools, licenses etc.",
          "The definition of responsibilities and authorities does not necessarily require formal role descriptions.",
        ],
      },
      {
        id: "GP 2.1.4",
        title: "Identify and make available resources",
        text: "The individuals performing and managing the process are identified and allocated according to the determined needs. The individuals performing and managing the process are being qualified to execute their responsibilities. The other resources, necessary for performing the process are identified, made available, allocated and used according to the determined needs.",
        notes: [
          "Qualification of individuals may include training, mentoring, or coaching.",
        ],
      },
      {
        id: "GP 2.1.5",
        title: "Monitor and adjust the performance of the process",
        text: "Process performance is monitored to identify deviations from the planning. Appropriate actions in case of deviations from the planning are taken. The planning is adjusted as necessary.",
      },
      {
        id: "GP 2.1.6",
        title: "Manage the interfaces between involved parties",
        text: "The individuals and groups including required external parties involved in the process performance are determined. Responsibilities are assigned to the relevant individuals or parties. Communication mechanisms between the involved parties are determined. Effective communication between the involved parties is established and maintained.",
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
        text: "The requirements for the content and structure of the work products to be produced are defined. Quality criteria for the work products are identified. Appropriate review and approval criteria for the work products are defined.",
        notes: [
          "Possible sources of documentation requirements may be e.g., best practices or lessons learned from other projects, standards, organization requirements, customer requirements, etc.",
          "There may be types of work products for which no review or approval is required, thus then there would be no need to define the corresponding criteria.",
        ],
      },
      {
        id: "GP 2.2.2",
        title:
          "Define the requirements for storage and control of the work products",
        text: "Requirements for the storage and control of the work products are defined, including their identification and distribution.",
        notes: [
          "Possible sources for the identification of requirements for storage and control may be e.g., legal requirements, data policies, best practices from other projects, tool related requirements, etc.",
          "Examples for work product storage are files in a file system, ticket in a tool, Wiki entry, paper documents etc.",
          "Where status of a work product is required in base practices, this should be managed via a defined status model.",
        ],
      },
      {
        id: "GP 2.2.3",
        title: "Identify, store and control the work products",
        text: "The work products to be controlled are identified. The work products are stored and controlled in accordance with the requirements. Change control is established for work products. Versioning and baselining of the work products is performed in accordance with the requirements for storage and control of the work products. The work products including the revision status are made available through appropriate mechanisms.",
      },
      {
        id: "GP 2.2.4",
        title: "Review and adjust work products",
        text: "The work products are reviewed against the defined requirements and criteria. Resolution of issues arising from work products reviews is ensured.",
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
        title: "Establish and maintain the standard process",
        text: "A suitable standard process is developed including required activities and their interactions. Inputs and outputs of the standard process are defined including the corresponding entry and exit criteria to determine the interactions and sequence with other processes. Process performance roles are identified and assigned to the standard process activities including their type of involvement, responsibilities, and authorities. Suitable guidance, procedures, and templates are provided to support the execution of the process as needed. Appropriate tailoring guidelines including predefined unambiguous criteria as well as predefined and unambiguous proceedings are defined based on identified deployment needs and context of the standard process. The standard process is maintained according to corresponding feedback from the monitoring of the deployed processes.",
        notes: [
          "An example for describing the involvement of the process roles in the activities is a RASI/RASIC representation.",
          "Procedures may also include description of specific methods to be used.",
          "For guidance on how to perform process improvements see the Process Improvement process (PIM.3).",
        ],
      },
      {
        id: "GP 3.1.2",
        title: "Determine the required competencies",
        text: "Required competencies, skills, and experience for performing the standard process are determined for the identified roles. Appropriate qualification methods to acquire the necessary competencies and skills are determined, maintained, and made available for the identified roles.",
        notes: [
          "Qualification methods are e.g., trainings, mentoring, self-study.",
          "Preparation includes e.g., identification or definition of trainings, mentoring concepts, self learning material.",
        ],
      },
      {
        id: "GP 3.1.3",
        title: "Determine the required resources",
        text: "Required physical and material resources and process infrastructure needs for performing the standard process are determined.",
        notes: [
          "This may include e.g., facilities, tools, licenses, networks, services, and samples supporting the establishment of the required work environment.",
        ],
      },
      {
        id: "GP 3.1.4",
        title: "Determine suitable methods to monitor the standard process",
        text: "Methods and required activities for monitoring the effectiveness and adequacy of the standard process are determined. Appropriate criteria and information needed to monitor the standard process are defined.",
        notes: [
          "Methods and activities to gather feedback regarding the standard process may be lessons learned, process compliance checks, internal audits, management reviews, change requests, reflection of state-of-the-art such as applicable international standards, etc.",
          "Information about process performance may be of qualitative or quantitative nature.",
        ],
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
          "Deploy a defined process that satisfies the context specific requirements of the use of the standard process",
        text: "The defined process is appropriately selected and/or tailored from the standard process. Conformance of defined process with standard process requirements and tailoring criteria is verified. The defined process is used as managed process to achieve the process outcomes.",
        notes: [
          "Changes in the standard process may require updates of the defined process.",
        ],
      },
      {
        id: "GP 3.2.2",
        title: "Ensure required competencies for the defined roles",
        text: "Human resources are allocated to the defined roles according to the required competencies and skills. Assignment of persons to roles and corresponding responsibilities and authorities for performing the defined process are communicated. Gaps in competencies and skills are identified, and corresponding qualification measures are initiated and monitored. Availability and usage of the project staff are measured and monitored.",
      },
      {
        id: "GP 3.2.3",
        title:
          "Ensure required resources to support the performance of the defined process",
        text: "Required information to perform the defined process is made available, allocated and used. Required physical and material resources, process infrastructure and work environment are made available, allocated and used. Availability and usage of resources are measured and monitored.",
      },
      {
        id: "GP 3.2.4",
        title: "Monitor the performance of the defined process",
        text: "Information is collected and analyzed according to the determined process monitoring methods to understand the effectiveness and adequacy of the defined process. Results of the analysis are made available to all affected parties and used to identify where continual improvement of the standard and/or defined process can be made.",
        notes: [
          "For guidance on how to perform process improvements see the Process Improvement process (PIM.3).",
        ],
      },
    ],
  },
];

// ─── DEFAULT ENABLED GROUPS ────────────────────────────────────

export const DEFAULT_ENABLED_GROUPS = ["SWE", "SUP", "MAN"];

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
    processes: [
      { id: "ACQ.4", name: "Supplier Monitoring" },
      { id: "ACQ.15", name: "Supplier Qualification" },
    ],
  },
  {
    id: "VAL",
    name: "VAL Process Group",
    processes: [{ id: "VAL.1", name: "Validation" }],
  },
  {
    id: "MLE",
    name: "MLE Process Group",
    processes: [
      { id: "MLE.1", name: "Machine Learning Requirements" },
      { id: "MLE.2", name: "Machine Learning Architecture" },
      { id: "MLE.3", name: "Machine Learning Model Development" },
      { id: "MLE.4", name: "Machine Learning Model Validation" },
    ],
  },
  {
    id: "HWE",
    name: "HWE Process Group",
    processes: [
      { id: "HWE.1", name: "Hardware Requirements Analysis" },
      { id: "HWE.2", name: "Hardware Design" },
      { id: "HWE.3", name: "Hardware Verification" },
    ],
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
