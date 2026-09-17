/**
 * Central workshop facts — single source of truth for the app.
 * Do NOT scatter fee / dates / UPI / capacity / contacts across components.
 * Locked decisions live in ROS2_WORKSHOP_PROJECT_CONTEXT.md.
 */
export const WORKSHOP = {
  title: "Unlocking Robotics with Robot Operating System",
  titleShort: "Unlocking Robotics with ROS2",
  rosHighlight: "ROS2",
  subtitle: "5-Day Hands-On Robotics Training Program",
  organizer: "Department of Automation & Robotics",
  institute: "MET's Institute of Technology Polytechnic B Tech",
  trainingPartner: "Robotry",
  trainingPartnerUrl: "https://www.robotry.in",

  datesLabel: "28 Sep – 02 Oct 2026",
  dateStartISO: "2026-09-28",
  dateEndISO: "2026-10-02",
  durationLabel: "5 Days",
  mode: "Offline",
  modeLabel: "Offline Hands-On Training",
  audience: "TE & BE",
  audienceLong: "TE & BE Automation & Robotics Students",

  feeAmount: 1500,
  feeLabel: "₹1,500",
  feeLabelPerStudent: "₹1,500 per student",

  capacity: 30,
  slug: "ros2-workshop-2026",

  payeeName: "Sandip Shelkar",
  upiId: "sandipshelkar.ss@oksbi",
  get upiDeepLink() {
    // Exact locked format (percent-encoding with %20, raw @ in the VPA).
    // NOTE: URLSearchParams would emit `+`/`%40` instead — functionally close
    // but not the specified string, so the link is built literally.
    const enc = (s: string) => encodeURIComponent(s); // %20 for spaces (not `+`)
    return (
      `upi://pay?pa=${this.upiId}` +
      `&pn=${enc(this.payeeName)}` +
      `&am=${this.feeAmount}` +
      `&cu=INR` +
      `&tn=${enc("ROS2 Workshop Registration")}`
    );
  },
  qrImagePath: "/payment/sandip-shelkar-upi.png",
  qrImageFallbackPath: "/payment/sandip-shelkar-upi.jpg",

  proofMaxBytes: 5 * 1024 * 1024,
  proofAcceptedMime: ["image/jpeg", "image/png", "image/webp"] as const,
  proofAcceptedExtensions: [".jpg", ".jpeg", ".png", ".webp"] as const,

  organizers: {
    coordinator: { role: "Workshop Coordinator", name: "Prof. Sandip Shelkar" },
    hod: { role: "Head of Department", name: "Prof. V. R. Kale" },
    principal: { role: "Principal", name: "Dr. R. S. Narkhede" },
    studentCoordinators: [
      { role: "Student Coordinator", name: "Rushikesh Saskar", phone: "8275229386" },
      { role: "Student Coordinator", name: "Rahul Chaudhari", phone: "8983707673" },
    ],
  },

  paymentWarning:
    "Your seat is confirmed only after your payment proof is successfully submitted. Opening this payment page does not reserve a seat.",

  siteTitle: "Unlocking Robotics with ROS2 | MET Automation & Robotics",
  siteDescription:
    "Register for the 5-day hands-on ROS2 workshop organized by the Department of Automation & Robotics at MET. Offline · 28 Sep – 02 Oct 2026 · ₹1,500 · 30 seats.",
} as const;

export type WorkshopYear = "TE" | "BE";
export const WORKSHOP_YEARS: WorkshopYear[] = ["TE", "BE"];

export const YEAR_LABELS: Record<WorkshopYear, string> = {
  TE: "TE / Third Year",
  BE: "BE / Fourth Year",
};

export const CURRICULUM = [
  {
    day: 1,
    title: "Fundamentals of Robotics and ROS",
    summary: "Why ROS2, Ubuntu + ROS2 setup, Python essentials and first Linux/ROS2 commands.",
    topics: [
      "Introduction to Robotics & ROS2",
      "Why ROS2? Use-cases and industry trends",
      "Ubuntu installation",
      "ROS2 installation and configuration",
      "Python programming essentials",
      "Basic Linux and ROS2 commands",
    ],
  },
  {
    day: 2,
    title: "ROS2 Core Concepts",
    summary: "Nodes, topics, services, actions — build packages and drive Turtlesim hands-on.",
    topics: [
      "ROS2 architecture, workspace & package structure",
      "Workspace build and package creation using ament_cmake",
      "Nodes, topics, services, actions",
      "Publisher / subscriber hands-on",
      "Launch files",
      "DDS & ROS_DOMAIN_ID",
      "Turtlesim teleoperation",
      "rqt_graph, ros2 topic info & CLI debugging tools",
    ],
  },
  {
    day: 3,
    title: "Robot Design and Simulation",
    summary: "Model in Fusion 360, convert to URDF, spawn in Gazebo and visualize in RViz2.",
    topics: [
      "Basic robot design in Fusion 360",
      "URDF conversion / introduction",
      "Gazebo simulation setup",
      "robot_state_publisher & robot spawning",
      "RViz2",
      "TF2 / view_frames",
      "Gazebo plugins, odometry, diff_drive, LiDAR plugins",
      "Custom Gazebo world",
    ],
  },
  {
    day: 4,
    title: "SLAM and Navigation",
    summary: "Teleoperate your simulated robot, then map and navigate with SLAM + Nav2.",
    topics: [
      "Teleoperation of the custom simulated robot",
      "SLAM",
      "Nav2",
      "Localization & map_saver",
      "Navigation parameters & costmap",
      "Behavior tree & lifecycle nodes",
    ],
  },
  {
    day: 5,
    title: "Bridging Hardware and ROS2",
    summary: "Talk to Arduino over serial, see OpenCV + ROS2 vision, and watch the Squarobot AMR demo.",
    topics: [
      "ROS2 communication with Arduino Uno (serial)",
      "Computer vision introduction: OpenCV + ROS2",
      "Squarobot AMR demonstration",
      "Q&A and discussion",
    ],
  },
] as const;

export const TECH_STACK = [
  "ROS2",
  "Ubuntu",
  "Python",
  "Gazebo",
  "RViz2",
  "TF2",
  "URDF",
  "SLAM",
  "Nav2",
  "Arduino",
  "OpenCV",
  "DDS",
  "Fusion 360",
] as const;

export const ROBOTRY_INSTITUTIONS = [
  "Dayanand Sagar University, Bengaluru",
  "KLE Technological University, Hubli",
  "National Institute of Technology, Raipur",
  "RGMCET, Nandyal",
  "JSPM Rajarshi Shahu College of Engineering, Pune",
  "D. Y. Patil College of Engineering, Akurdi",
  "Rajarambapu Institute of Technology, Islampur",
  "Zeal College of Engineering, Pune",
  "Dr. D. Y. Patil Institute of Technology, Pimpri",
] as const;

export const FAQS = [
  {
    q: "Who can register?",
    a: "The workshop is for TE (Third Year) and BE (Fourth Year) Automation & Robotics students. Registration is limited to 30 confirmed seats.",
  },
  {
    q: "Is the workshop offline?",
    a: "Yes. It is an offline, hands-on training program held 28 Sep – 02 Oct 2026. You will work directly with the tools, simulation and hardware demonstrations.",
  },
  {
    q: "How much is the fee and how do I pay?",
    a: "The fee is ₹1,500 per student, paid directly via UPI to Sandip Shelkar (sandipshelkar.ss@oksbi). Scan the official QR on the payment step or use the Open UPI App button, then upload your payment screenshot.",
  },
  {
    q: "How many seats are available?",
    a: "Only 30 confirmed seats. Live availability is shown on this page and on the registration form. Once 30 payment proofs are confirmed, registration closes automatically.",
  },
  {
    q: "What happens after I upload my payment proof?",
    a: "Your registration is finalized on the server immediately if a seat is still available, and you receive a registration ID like ROS2-2026-0001. The status shown is “Payment proof received” — screenshots are accepted at face value and are not bank-verified.",
  },
  {
    q: "Does opening the payment page reserve my seat?",
    a: "No. Your seat is confirmed only after your payment proof is successfully submitted. If the last seat is taken while you are on the payment page, you will see a polite Workshop Full message.",
  },
  {
    q: "What software and tools are covered?",
    a: "ROS2, Ubuntu, Python, Gazebo, RViz2, TF2, URDF, SLAM, Nav2, Arduino (serial), OpenCV and Fusion 360 — applied through guided, hands-on sessions each day.",
  },
  {
    q: "Do I need prior ROS2 experience?",
    a: "No. Day 1 starts from robotics and ROS2 fundamentals and builds step by step to simulation, SLAM/navigation and hardware communication by Day 5.",
  },
] as const;
