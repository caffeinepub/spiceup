import Iter "mo:core/Iter";
import Order "mo:core/Order";
import Time "mo:core/Time";
import Array "mo:core/Array";
import Map "mo:core/Map";
import Runtime "mo:core/Runtime";

actor {
  type Assessment = {
    id : Nat;
    name : Text;
    description : Text;
    status : Text;
    createdAt : Time.Time;
  };

  module Assessment {
    public func compare(a1 : Assessment, a2 : Assessment) : Order.Order {
      Nat.compare(a1.id, a2.id);
    };
  };

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
  let targetProfiles = Map.empty<Nat, TargetProfile>();
  let assessmentPlans = Map.empty<Nat, AssessmentPlan>();
  let workProducts = Map.empty<Nat, WorkProduct>();
  let assessmentResults = Map.empty<Nat, AssessmentResult>();
  let reports = Map.empty<Nat, Report>();

  // Assessment CRUD
  public shared ({ caller }) func createAssessment(name : Text, description : Text, status : Text) : async Nat {
    let id = nextId;
    nextId += 1;
    let assessment : Assessment = {
      id;
      name;
      description;
      status;
      createdAt = Time.now();
    };
    assessments.add(id, assessment);
    id;
  };

  public query ({ caller }) func getAssessment(id : Nat) : async Assessment {
    switch (assessments.get(id)) {
      case (null) { Runtime.trap("Assessment not found") };
      case (?assessment) { assessment };
    };
  };

  public query ({ caller }) func getAllAssessments() : async [Assessment] {
    assessments.values().toArray().sort();
  };

  public shared ({ caller }) func updateAssessment(id : Nat, name : Text, description : Text, status : Text) : async () {
    switch (assessments.get(id)) {
      case (null) { Runtime.trap("Assessment not found") };
      case (?existing) {
        let updated : Assessment = {
          id;
          name;
          description;
          status;
          createdAt = existing.createdAt;
        };
        assessments.add(id, updated);
      };
    };
  };

  public shared ({ caller }) func deleteAssessment(id : Nat) : async () {
    if (not assessments.containsKey(id)) {
      Runtime.trap("Assessment not found");
    };
    assessments.remove(id);
  };

  // TargetProfile
  public shared ({ caller }) func createTargetProfile(assessmentId : Nat, name : Text, criteria : Text, skillLevel : Text) : async Nat {
    let id = nextId;
    nextId += 1;
    let targetProfile : TargetProfile = {
      id;
      assessmentId;
      name;
      criteria;
      skillLevel;
    };
    targetProfiles.add(id, targetProfile);
    id;
  };

  public query ({ caller }) func getTargetProfile(id : Nat) : async TargetProfile {
    switch (targetProfiles.get(id)) {
      case (null) { Runtime.trap("TargetProfile not found") };
      case (?tp) { tp };
    };
  };

  public query ({ caller }) func getAllTargetProfiles() : async [TargetProfile] {
    targetProfiles.values().toArray().sort();
  };

  // AssessmentPlan
  public shared ({ caller }) func createAssessmentPlan(assessmentId : Nat, planDetails : Text, scheduledDate : Time.Time, status : Text) : async Nat {
    let id = nextId;
    nextId += 1;
    let plan : AssessmentPlan = {
      id;
      assessmentId;
      planDetails;
      scheduledDate;
      status;
    };
    assessmentPlans.add(id, plan);
    id;
  };

  public query ({ caller }) func getAssessmentPlan(id : Nat) : async AssessmentPlan {
    switch (assessmentPlans.get(id)) {
      case (null) { Runtime.trap("AssessmentPlan not found") };
      case (?plan) { plan };
    };
  };

  public query ({ caller }) func getAllAssessmentPlans() : async [AssessmentPlan] {
    assessmentPlans.values().toArray().sort();
  };

  // WorkProduct
  public shared ({ caller }) func addWorkProduct(assessmentId : Nat, name : Text, fileType : Text, notes : Text) : async Nat {
    let id = nextId;
    nextId += 1;
    let product : WorkProduct = {
      id;
      assessmentId;
      name;
      fileType;
      uploadedAt = Time.now();
      notes;
    };
    workProducts.add(id, product);
    id;
  };

  public query ({ caller }) func getWorkProduct(id : Nat) : async WorkProduct {
    switch (workProducts.get(id)) {
      case (null) { Runtime.trap("WorkProduct not found") };
      case (?product) { product };
    };
  };

  public query ({ caller }) func getAllWorkProducts() : async [WorkProduct] {
    workProducts.values().toArray().sort();
  };

  // AssessmentResult
  public shared ({ caller }) func addAssessmentResult(assessmentId : Nat, score : Nat, findings : Text, recommendations : Text) : async Nat {
    let id = nextId;
    nextId += 1;
    let result : AssessmentResult = {
      id;
      assessmentId;
      score;
      findings;
      recommendations;
      completedAt = Time.now();
    };
    assessmentResults.add(id, result);
    id;
  };

  public query ({ caller }) func getAssessmentResult(id : Nat) : async AssessmentResult {
    switch (assessmentResults.get(id)) {
      case (null) { Runtime.trap("AssessmentResult not found") };
      case (?result) { result };
    };
  };

  public query ({ caller }) func getAllAssessmentResults() : async [AssessmentResult] {
    assessmentResults.values().toArray().sort();
  };

  // Report
  public shared ({ caller }) func generateReport(assessmentId : Nat, reportContent : Text) : async Nat {
    let id = nextId;
    nextId += 1;
    let report : Report = {
      id;
      assessmentId;
      reportContent;
      generatedAt = Time.now();
    };
    reports.add(id, report);
    id;
  };

  public query ({ caller }) func getReport(id : Nat) : async Report {
    switch (reports.get(id)) {
      case (null) { Runtime.trap("Report not found") };
      case (?report) { report };
    };
  };

  public query ({ caller }) func getAllReports() : async [Report] {
    reports.values().toArray().sort();
  };
};
