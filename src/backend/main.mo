import Stripe "stripe/stripe";
import AccessControl "authorization/access-control";
import OutCall "http-outcalls/outcall";
import MixinAuthorization "authorization/MixinAuthorization";

import Runtime "mo:core/Runtime";
import Principal "mo:core/Principal";
import Map "mo:core/Map";
import List "mo:core/List";
import Nat "mo:core/Nat";
import Int "mo:core/Int";
import Time "mo:core/Time";
import Array "mo:core/Array";
import Order "mo:core/Order";
import Iter "mo:core/Iter";


actor {
  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);

  var stripeConfig : ?Stripe.StripeConfiguration = null;

  var goalAmountCents : Nat = 10000;

  public type UserProfile = {
    name : Text;
  };

  let userProfiles = Map.empty<Principal, UserProfile>();

  public type Tip = {
    amount : Nat;
    currency : Text;
    message : Text;
    sender : Text;
    timestamp : Nat;
    status : Text;
    paymentIntentId : ?Text;
  };

  public type TipRecord = {
    amount : Nat;
    currency : Text;
    message : Text;
    sender : Text;
    createdAt : Nat;
    status : Text;
    paymentIntentId : ?Text;
  };

  public type PublicStats = {
    totalAmountCents : Nat;
    tipCount : Nat;
    recentTips : [Tip];
  };

  // Transform function for HTTP outcalls
  public query func transform(input : OutCall.TransformationInput) : async OutCall.TransformationOutput {
    OutCall.transform(input);
  };

  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can access profiles");
    };
    userProfiles.get(caller);
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    if (caller != user and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Can only view your own profile");
    };
    userProfiles.get(user);
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can save profiles");
    };
    userProfiles.add(caller, profile);
  };

  public shared ({ caller }) func setStripeConfiguration(config : Stripe.StripeConfiguration) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #admin)) {
      Runtime.trap("Unauthorized: Only admins can perform this action");
    };
    stripeConfig := ?config;
  };

  public query func isStripeConfigured() : async Bool {
    stripeConfig != null;
  };

  public shared ({ caller }) func getStripeSessionStatus(sessionId : Text) : async Stripe.StripeSessionStatus {
    if (not AccessControl.hasPermission(accessControlState, caller, #admin)) {
      Runtime.trap("Unauthorized: Only admins can view session status");
    };
    let config = getStripeConfig();
    await Stripe.getSessionStatus(config, sessionId, transform);
  };

  // Stripe Integration
  func getStripeConfig() : Stripe.StripeConfiguration {
    switch (stripeConfig) {
      case (?config) { config };
      case (_) { Runtime.trap("Stripe needs to be first configured") };
    };
  };

  public func createCheckoutSessionInternal(actorId : Principal, items : [Stripe.ShoppingItem], successUrl : Text, cancelUrl : Text) : async Text {
    await Stripe.createCheckoutSession(getStripeConfig(), actorId, items, successUrl, cancelUrl, transform);
  };

  public shared ({ caller }) func createCheckoutSession(items : [Stripe.ShoppingItem], successUrl : Text, cancelUrl : Text) : async Text {
    await createCheckoutSessionInternal(caller, items, successUrl, cancelUrl);
  };

  let tips = List.empty<TipRecord>();

  // Add new tip (admin-only to prevent fake tips from corrupting stats)
  public shared ({ caller }) func addTip(amount : Nat, currency : Text, message : Text, sender : Text, status : Text, paymentIntentId : ?Text) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #admin)) {
      Runtime.trap("Unauthorized: Only admins can add tips");
    };
    let newTip : TipRecord = {
      amount;
      currency;
      message;
      sender;
      createdAt = Int.abs(Time.now());
      status;
      paymentIntentId;
    };
    tips.add(newTip);
  };

  public query ({ caller }) func getAllTips() : async [TipRecord] {
    if (not AccessControl.hasPermission(accessControlState, caller, #admin)) {
      Runtime.trap("Unauthorized: Only admin can view payment history");
    };

    tips.toArray();
  };

  public query ({ caller }) func getTotalTipsAmount() : async Nat {
    if (not AccessControl.hasPermission(accessControlState, caller, #admin)) {
      Runtime.trap("Unauthorized: Only admin can view earnings");
    };

    tips.values().foldLeft(0, func(accum : Nat, tip : TipRecord) : Nat { accum + tip.amount });
  };

  public shared ({ caller }) func createTip(amount : Nat, currency : Text, message : Text, sender : Text) : async Text {
    let items = [
      {
        currency;
        productName = "Tip";
        productDescription = message;
        priceInCents = amount * 100;
        quantity = 1;
      },
    ];

    let successUrl = "https://dappcraft.io/tipcrafter";
    let cancelUrl = "https://dappcraft.io/tipcrafter";

    await createCheckoutSessionInternal(caller, items, successUrl, cancelUrl);
  };

  // New feature: Public goal amount
  public shared ({ caller }) func setGoal(amount : Nat) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #admin)) {
      Runtime.trap("Unauthorized: Only admin can set goal");
    };
    goalAmountCents := amount;
  };

  public query func getGoal() : async Nat {
    goalAmountCents;
  };

  // New feature: Public stats endpoint
  public query func getPublicStats() : async PublicStats {
    let totalAmount = tips.values().foldLeft(0, func(accum : Nat, tip : TipRecord) : Nat { accum + tip.amount });

    let tipsArray = tips.toArray();

    func compareTips(a : TipRecord, b : TipRecord) : Order.Order {
      Nat.compare(b.createdAt, a.createdAt);
    };

    let recentTips = tipsArray.sort(compareTips).sliceToArray(0, Nat.min(5, tipsArray.size()));
    let mappedTips = recentTips.map(
      func(tip) {
        {
          tip with
          timestamp = tip.createdAt;
        };
      }
    );

    {
      totalAmountCents = totalAmount;
      tipCount = tips.size();
      recentTips = mappedTips;
    };
  };
};
