import Map "mo:core/Map";
import Nat "mo:core/Nat";
import Text "mo:core/Text";
import Time "mo:core/Time";
import Iter "mo:core/Iter";
import Order "mo:core/Order";
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

  // Re-add old types
  type TargetProfile = {
    id : Nat;
    assessmentId : Nat;
    name : Text;
    criteria : Text;
    skillLevel : Text;
  };

  module TargetProfile {
    public func compare(tp1 : TargetProfile, tp2 : TargetProfile) : Order.Order {
      Nat.compare(tp1.id, tp2.id);
    };
  };

  type WorkProduct = {
    id : Nat;
    assessmentId : Nat;
    name : Text;
    fileType : Text;
    uploadedAt : Time.Time;
    notes : Text;
  };

  module WorkProduct {
    public func compare(wp1 : WorkProduct, wp2 : WorkProduct) : Order.Order {
      Nat.compare(wp1.id, wp2.id);
    };
  };

  type AssessmentPlan = {
    id : Nat;
    assessmentId : Nat;
    planDetails : Text;
    scheduledDate : Time.Time;
    status : Text;
  };

  module AssessmentPlan {
    public func compare(ap1 : AssessmentPlan, ap2 : AssessmentPlan) : Order.Order {
      Nat.compare(ap1.id, ap2.id);
    };
  };

  type AssessmentResult = {
    id : Nat;
    assessmentId : Nat;
    score : Nat;
    findings : Text;
    recommendations : Text;
    completedAt : Time.Time;
  };

  module AssessmentResult {
    public func compare(ar1 : AssessmentResult, ar2 : AssessmentResult) : Order.Order {
      Nat.compare(ar1.id, ar2.id);
    };
  };

  type Report = {
    id : Nat;
    assessmentId : Nat;
    reportContent : Text;
    generatedAt : Time.Time;
  };

  module Report {
    public func compare(r1 : Report, r2 : Report) : Order.Order {
      Nat.compare(r1.id, r2.id);
    };
  };

  var nextId = 1;

  let assessments = Map.empty<Nat, Assessment>();
  let assessmentInfoData = Map.empty<Nat, AssessmentInfoData>();
  let processGroupConfigs = Map.empty<Nat, ProcessGroupConfig>();
  let assessmentDays = Map.empty<Nat, AssessmentDay>();
  let practiceRatings = Map.empty<Nat, PracticeRating>();

  // Restore old persistent maps
  let targetProfiles = Map.empty<Nat, TargetProfile>();
  let assessmentPlans = Map.empty<Nat, AssessmentPlan>();
  let workProducts = Map.empty<Nat, WorkProduct>();
  let assessmentResults = Map.empty<Nat, AssessmentResult>();
  let reports = Map.empty<Nat, Report>();

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
};
