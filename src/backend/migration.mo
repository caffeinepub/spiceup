import Map "mo:core/Map";
import Nat "mo:core/Nat";

module {
  public type Assessment = {
    id : Nat;
    name : Text;
    status : Text;
    currentStep : Text;
    updatedAt : Int;
    createdAt : Int;
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
    globalStrengths : Text;
    globalWeaknesses : Text;
  };

  public type ProjectEvidence = {
    id : Nat;
    assessmentId : Nat;
    processId : Text;
    name : Text;
    link : Text;
    version : Text;
  };

  type OldActor = {
    var nextId : Nat;
    var assessments : Map.Map<Nat, Assessment>;
    var assessmentInfoData : Map.Map<Nat, AssessmentInfoData>;
    var processGroupConfigs : Map.Map<Nat, ProcessGroupConfig>;
    var assessmentDays : Map.Map<Nat, AssessmentDay>;
    var practiceRatings : Map.Map<Nat, PracticeRating>;
    var reportGlobalInputs : Map.Map<Nat, ReportGlobalInputs>;
  };

  type NewActor = {
    var nextId : Nat;
    var assessments : Map.Map<Nat, Assessment>;
    var assessmentInfoData : Map.Map<Nat, AssessmentInfoData>;
    var processGroupConfigs : Map.Map<Nat, ProcessGroupConfig>;
    var assessmentDays : Map.Map<Nat, AssessmentDay>;
    var practiceRatings : Map.Map<Nat, PracticeRating>;
    var reportGlobalInputs : Map.Map<Nat, ReportGlobalInputs>;
    var projectEvidences : Map.Map<Nat, ProjectEvidence>;
  };

  public func run(old : OldActor) : NewActor {
    let projectEvidences = Map.empty<Nat, ProjectEvidence>();
    {
      var nextId = old.nextId;
      var assessments = old.assessments;
      var assessmentInfoData = old.assessmentInfoData;
      var processGroupConfigs = old.processGroupConfigs;
      var assessmentDays = old.assessmentDays;
      var practiceRatings = old.practiceRatings;
      var reportGlobalInputs = old.reportGlobalInputs;
      var projectEvidences;
    };
  };
};
