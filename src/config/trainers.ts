/**
 * Trainer metadata — single source of truth.
 * Bios are concise, public-facing summaries grounded in supplied material.
 * Never add private contact details, addresses, or CGPA here.
 */
export interface Trainer {
  slug: string;
  name: string;
  role: string;
  image: string | null;
  initials: string;
  bio: string;
  focus: string[];
  featured?: boolean;
}

export const TRAINERS: Trainer[] = [
  {
    slug: "aryan-jagushte",
    name: "Aryan Jagushte",
    role: "Founder & Robotics Engineer, Robotry",
    image: "/trainers/aryan-jagushte.jpg",
    initials: "AJ",
    bio: "Founder and Robotics Engineer at Robotry, working on AI, robotics, ROS and hands-on engineering education that bridges theory with practical implementation. He runs a company and podcast helping students skill up, with a community of 17k+ followers on LinkedIn.",
    focus: ["Robotry founder", "ROS & AI education", "Hands-on training"],
    featured: true,
  },
  {
    slug: "siddhant-nandgave",
    name: "Siddhant Nandgave",
    role: "Mechatronics Engineering Student | Robotics / ROS2",
    image: "/trainers/siddhant-nandgave.jpg",
    initials: "SN",
    bio: "Mechatronics engineering student and Intern at Robotry.ai, building ROS2 Jazzy applications on simulation and real hardware — including a hand gesture-controlled robotic arm. Trained in embedded systems and STM32, he has delivered robotics & AI and 5-day ROS2 workshops for NIT Raipur and AISSMS Pune.",
    focus: ["ROS2", "Embedded systems", "Workshop delivery"],
  },
  {
    slug: "omkar-honrao",
    name: "Omkar Honrao",
    role: "Robotics Research Intern | Autonomous Systems",
    image: "/trainers/omkar-honrao.jpg",
    initials: "OH",
    bio: "Robotics Research Intern at Robotry working on ROS2-based systems and robot communication. He builds autonomous navigation with SLAM Toolbox and Nav2 in Gazebo/RViz2, alongside computer-vision projects with OpenCV — focused on autonomous systems, simulation and vision.",
    focus: ["ROS2", "SLAM & Nav2", "Gazebo / RViz2", "Computer vision"],
  },
];
