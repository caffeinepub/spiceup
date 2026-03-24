import Map "mo:core/Map";
import Nat "mo:core/Nat";
import Text "mo:core/Text";
import Time "mo:core/Time";
import Iter "mo:core/Iter";
import Runtime "mo:core/Runtime";



actor {
  public type Assessment = {
    id : Nat;
    name : Text;
    status : Text;
    currentStep : Text;
    updatedAt : Time.Time;
    createdAt : Time.Time;
  };

  public type AssessmentInfoData = {
    assessmentId : Nat;
    startDate : Text;
    endDate : Text;
    sponsor : Text;
    leadAssessor : Text;
    coAssessor : Text;
    intacsId : Text;
    assessorBody : Text;
    assessedParty : Text;
    assessedSite : Text;
    unitDepartment : Text;
    projectContactSWDev : Text;
    projectContactSWQuality : Text;
    projectName : Text;
    projectScope : Text;
    modelBasedDev : Bool;
    agileEnvironments : Bool;
    developmentExternal : Bool;
    pamVersion : Text;
    vdaVersion : Text;
    assessmentClass : Text;
    targetCapabilityLevel : Text;
    functionalSafetyLevel : Text;
    cybersecurityLevel : Text;
    additionalRemarks : Text;
  };

  public type ProcessGroupConfig = {
    assessmentId : Nat;
    enabledGroups : Text;
    processLevels : Text;
  };

  public type AssessmentDay = {
    id : Nat;
    assessmentId : Nat;
    dayNumber : Nat;
    date : Text;
    timeFrom : Text;
    timeTo : Text;
    sessions : Text;
  };

  public type PracticeRating = {
    id : Nat;
    assessmentId : Nat;
    processId : Text;
    level : Nat;
    practiceId : Text;
    rating : Text;
    strengths : Text;
    weaknesses : Text;
    workProductsInspected : Text;
  };

  public type ReportGlobalInputs = {
    assessmentId : Nat;
    globalStrengths : Text; // JSON array of strings
    globalWeaknesses : Text; // JSON array of strings
  };

  public type ProjectEvidence = {
    id : Nat;
    assessmentId : Nat;
    processId : Text;
    name : Text;
    link : Text;
    version : Text;
  };

  stable var nextId = 1;

  stable var assessmentEntries : [(Nat, Assessment)] = [];
  stable var assessmentInfoEntries : [(Nat, AssessmentInfoData)] = [];
  stable var processGroupEntries : [(Nat, ProcessGroupConfig)] = [];
  stable var dayEntries : [(Nat, AssessmentDay)] = [];
  stable var practiceRatingEntries : [(Nat, PracticeRating)] = [];
  stable var reportGlobalInputsEntries : [(Nat, ReportGlobalInputs)] = [];
  stable var projectEvidenceEntries : [(Nat, ProjectEvidence)] = [];

  let assessments = Map.fromIter<Nat, Assessment>(assessmentEntries.values());
  let assessmentInfoData = Map.fromIter<Nat, AssessmentInfoData>(assessmentInfoEntries.values());
  let processGroupConfigs = Map.fromIter<Nat, ProcessGroupConfig>(processGroupEntries.values());
  let assessmentDays = Map.fromIter<Nat, AssessmentDay>(dayEntries.values());
  let practiceRatings = Map.fromIter<Nat, PracticeRating>(practiceRatingEntries.values());
  let reportGlobalInputs = Map.fromIter<Nat, ReportGlobalInputs>(reportGlobalInputsEntries.values());
  let projectEvidences = Map.fromIter<Nat, ProjectEvidence>(projectEvidenceEntries.values());

  // Delete operation: Remove ALL related data for an assessment
  public shared ({ caller }) func deleteAssessment(id : Nat) : async () {
    if (not assessments.containsKey(id)) {
      Runtime.trap("Assessment not found");
    };

    assessments.remove(id);
    assessmentInfoData.remove(id);
    processGroupConfigs.remove(id);
    reportGlobalInputs.remove(id);

    let filteredDayEntries = dayEntries.filter(
      func((_, day)) { day.assessmentId != id }
    );
    dayEntries := filteredDayEntries;

    let filteredRatingEntries = practiceRatingEntries.filter(
      func((_, rating)) { rating.assessmentId != id }
    );
    practiceRatingEntries := filteredRatingEntries;

    // Remove all project evidence entries for this assessment
    let filteredEvidenceEntries = projectEvidenceEntries.filter(
      func((_, evidence)) { evidence.assessmentId != id }
    );
    projectEvidenceEntries := filteredEvidenceEntries;
  };

  // Assessment CRUD
  public shared ({ caller }) func createAssessment(name : Text) : async Nat {
    let id = nextId;
    nextId += 1;

    let now = Time.now();
    let assessment : Assessment = {
      id;
      name;
      status = "Active";
      currentStep = "assessment-info";
      updatedAt = now;
      createdAt = now;
    };

    assessments.add(id, assessment);
    id;
  };

  public query ({ caller }) func getAllAssessments() : async [Assessment] {
    assessments.values().toArray();
  };

  public query ({ caller }) func getAssessment(id : Nat) : async Assessment {
    switch (assessments.get(id)) {
      case (null) { Runtime.trap("Assessment not found") };
      case (?assessment) { assessment };
    };
  };

  public shared ({ caller }) func updateAssessmentStatus(id : Nat, status : Text) : async () {
    switch (assessments.get(id)) {
      case (null) { Runtime.trap("Assessment not found") };
      case (?assessment) {
        let updatedAssessment = {
          assessment with
          status;
          updatedAt = Time.now();
        };
        assessments.add(id, updatedAssessment);
      };
    };
  };

  public shared ({ caller }) func markAssessmentCompleted(id : Nat) : async () {
    await updateAssessmentStatus(id, "Completed");
  };

  public shared ({ caller }) func updateAssessmentStep(id : Nat, step : Text) : async () {
    switch (assessments.get(id)) {
      case (null) { Runtime.trap("Assessment not found") };
      case (?assessment) {
        let updatedAssessment = {
          assessment with
          currentStep = step;
          updatedAt = Time.now();
        };
        assessments.add(id, updatedAssessment);
      };
    };
  };

  // Assessment Info Data
  public shared ({ caller }) func saveAssessmentInfoData(data : AssessmentInfoData) : async () {
    assessmentInfoData.add(data.assessmentId, data);
  };

  public query ({ caller }) func getAssessmentInfoData(assessmentId : Nat) : async AssessmentInfoData {
    switch (assessmentInfoData.get(assessmentId)) {
      case (null) { Runtime.trap("Assessment Info Data not found") };
      case (?data) { data };
    };
  };

  // Process Group Config
  public shared ({ caller }) func saveProcessGroupConfig(assessmentId : Nat, enabledGroups : Text, processLevels : Text) : async () {
    let config : ProcessGroupConfig = {
      assessmentId;
      enabledGroups;
      processLevels;
    };
    processGroupConfigs.add(assessmentId, config);
  };

  public query ({ caller }) func getProcessGroupConfig(assessmentId : Nat) : async ProcessGroupConfig {
    switch (processGroupConfigs.get(assessmentId)) {
      case (null) { Runtime.trap("Process Group Config not found") };
      case (?config) { config };
    };
  };

  // Assessment Days
  public shared ({ caller }) func saveAssessmentDay(assessmentId : Nat, dayNumber : Nat, date : Text, timeFrom : Text, timeTo : Text, sessions : Text) : async Nat {
    let id = nextId;
    nextId += 1;

    let day : AssessmentDay = {
      id;
      assessmentId;
      dayNumber;
      date;
      timeFrom;
      timeTo;
      sessions;
    };

    assessmentDays.add(id, day);
    id;
  };

  public query ({ caller }) func getAssessmentDays(assessmentId : Nat) : async [AssessmentDay] {
    let filteredDays = assessmentDays.values().filter(
      func(day) { day.assessmentId == assessmentId }
    );
    filteredDays.toArray();
  };

  public shared ({ caller }) func deleteAssessmentDay(id : Nat) : async () {
    if (not assessmentDays.containsKey(id)) {
      Runtime.trap("Assessment Day not found");
    };
    assessmentDays.remove(id);
  };

  // Practice Ratings
  public shared ({ caller }) func savePracticeRating(assessmentId : Nat, processId : Text, level : Nat, practiceId : Text, rating : Text, strengths : Text, weaknesses : Text, workProductsInspected : Text) : async Nat {
    let id = nextId;
    nextId += 1;

    let ratingData : PracticeRating = {
      id;
      assessmentId;
      processId;
      level;
      practiceId;
      rating;
      strengths;
      weaknesses;
      workProductsInspected;
    };

    practiceRatings.add(id, ratingData);
    id;
  };

  public query ({ caller }) func getPracticeRatings(assessmentId : Nat, processId : Text) : async [PracticeRating] {
    let filteredRatings = practiceRatings.values().filter(
      func(rating) { rating.assessmentId == assessmentId and rating.processId == processId }
    );
    filteredRatings.toArray();
  };

  public query ({ caller }) func getAllPracticeRatingsForAssessment(assessmentId : Nat) : async [PracticeRating] {
    let filteredRatings = practiceRatings.values().filter(
      func(rating) { rating.assessmentId == assessmentId }
    );
    filteredRatings.toArray();
  };

  // Report Global Inputs
  public shared ({ caller }) func saveReportGlobalInputs(assessmentId : Nat, globalStrengths : Text, globalWeaknesses : Text) : async () {
    let data : ReportGlobalInputs = {
      assessmentId;
      globalStrengths;
      globalWeaknesses;
    };
    reportGlobalInputs.add(assessmentId, data);
  };

  public query ({ caller }) func getReportGlobalInputs(assessmentId : Nat) : async ReportGlobalInputs {
    switch (reportGlobalInputs.get(assessmentId)) {
      case (null) {
        { assessmentId; globalStrengths = "[]"; globalWeaknesses = "[]" };
      };
      case (?data) { data };
    };
  };

  // Project Evidence CRUD
  public shared ({ caller }) func addProjectEvidence(assessmentId : Nat, processId : Text, name : Text, link : Text, version : Text) : async Nat {
    let id = nextId;
    nextId += 1;

    let evidence : ProjectEvidence = {
      id;
      assessmentId;
      processId;
      name;
      link;
      version;
    };

    projectEvidences.add(id, evidence);
    id;
  };

  public shared ({ caller }) func updateProjectEvidence(id : Nat, processId : Text, name : Text, link : Text, version : Text) : async Bool {
    switch (projectEvidences.get(id)) {
      case (null) { Runtime.trap("Project Evidence not found") };
      case (?existing) {
        let updatedEvidence = {
          existing with
          processId;
          name;
          link;
          version;
        };
        projectEvidences.add(id, updatedEvidence);
        true;
      };
    };
  };

  public shared ({ caller }) func deleteProjectEvidence(id : Nat) : async Bool {
    if (not projectEvidences.containsKey(id)) {
      Runtime.trap("Project Evidence not found");
    };
    projectEvidences.remove(id);
    true;
  };

  public query ({ caller }) func getProjectEvidenceForAssessment(assessmentId : Nat) : async [ProjectEvidence] {
    let filteredEvidence = projectEvidences.values().filter(
      func(evidence) { evidence.assessmentId == assessmentId }
    );
    filteredEvidence.toArray();
  };

  system func preupgrade() {
    assessmentEntries := assessments.entries().toArray();
    assessmentInfoEntries := assessmentInfoData.entries().toArray();
    processGroupEntries := processGroupConfigs.entries().toArray();
    dayEntries := assessmentDays.entries().toArray();
    practiceRatingEntries := practiceRatings.entries().toArray();
    reportGlobalInputsEntries := reportGlobalInputs.entries().toArray();
    projectEvidenceEntries := projectEvidences.entries().toArray();
  };

  system func postupgrade() {
    assessments.clear();
    assessmentInfoData.clear();
    processGroupConfigs.clear();
    assessmentDays.clear();
    practiceRatings.clear();
    reportGlobalInputs.clear();
    projectEvidences.clear();

    for ((k, v) in assessmentEntries.values()) { assessments.add(k, v) };
    for ((k, v) in assessmentInfoEntries.values()) {
      assessmentInfoData.add(k, v);
    };
    for ((k, v) in processGroupEntries.values()) {
      processGroupConfigs.add(k, v);
    };
    for ((k, v) in dayEntries.values()) { assessmentDays.add(k, v) };
    for ((k, v) in practiceRatingEntries.values()) {
      practiceRatings.add(k, v);
    };
    for ((k, v) in reportGlobalInputsEntries.values()) {
      reportGlobalInputs.add(k, v);
    };
    for ((k, v) in projectEvidenceEntries.values()) {
      projectEvidences.add(k, v);
    };

    assessmentEntries := [];
    assessmentInfoEntries := [];
    processGroupEntries := [];
    dayEntries := [];
    practiceRatingEntries := [];
    reportGlobalInputsEntries := [];
    projectEvidenceEntries := [];
  };
};
