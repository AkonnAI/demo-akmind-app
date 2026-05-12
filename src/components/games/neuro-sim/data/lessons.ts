export type Lesson = {
  id: number
  title: string
  subtitle: string
  district: string
  xpReward: number
  briefText: string
  scaffoldCode: string
}

export const LESSONS: Lesson[] = [
  {
    id: 1,
    title: 'Variable Machine',
    subtitle: 'Power the grid with variables',
    district: 'Terminal City',
    xpReward: 150,
    briefText:
      'NOVA: The power grid is down. Define 5 variables to restore it. Each variable powers one tower.',
    scaffoldCode:
      '# Define 5 variables below\n# Try: name, age, city, score, is_active\n\n',
  },
  {
    id: 2,
    title: 'Decision Tower',
    subtitle: 'Route trains with if/else',
    district: 'Terminal City',
    xpReward: 175,
    briefText:
      'NOVA: Two tracks. One passenger. Your conditions decide the route.',
    scaffoldCode:
      "age = int(input('Passenger age: '))\n# Write if/elif/else below\n\n",
  },
  {
    id: 3,
    title: 'Loop Engine',
    subtitle: 'Run the factory with loops',
    district: 'Factory District',
    xpReward: 175,
    briefText: 'NOVA: The machines are idle. Write a loop to start production.',
    scaffoldCode: '# Write a for loop\n# Print numbers 1 to 10\n\n',
  },
  {
    id: 4,
    title: 'Data Vault',
    subtitle: 'Crack the vault with lists and dicts',
    district: 'Terminal City',
    xpReward: 200,
    briefText:
      'NOVA: The vault is locked. Use lists and dicts to open it.',
    scaffoldCode:
      '# Create a list of 3 cities\n# Create a dict with name, age, city\n\n',
  },
  {
    id: 5,
    title: 'Function Factory',
    subtitle: 'Build reusable machines',
    district: 'Factory District',
    xpReward: 200,
    briefText:
      'NOVA: Write functions that can be called again and again.',
    scaffoldCode:
      '# Write a function that takes a number and returns it doubled\n\n',
  },
  {
    id: 6,
    title: 'API Courier',
    subtitle: 'Call the internet from your code',
    district: 'Comms District',
    xpReward: 225,
    briefText:
      'NOVA: The city needs live data. Send a courier drone to fetch it.',
    scaffoldCode:
      'import requests\n# Call https://wttr.in/Bangalore?format=j1\n# Print the temperature\n\n',
  },
  {
    id: 7,
    title: 'JSON Vault',
    subtitle: 'Navigate nested data',
    district: 'Comms District',
    xpReward: 225,
    briefText:
      'NOVA: The data is locked in layers. Navigate the JSON to extract what you need.',
    scaffoldCode:
      'import json\ndata = \'{"city": "Bangalore", "info": {"temp": 31, "humidity": 72}}\'\n# Parse and print city and temp\n\n',
  },
  {
    id: 8,
    title: 'Weather Buddy',
    subtitle: 'Build your first real app',
    district: 'Launch District',
    xpReward: 300,
    briefText:
      'NOVA: Build a complete app. Fetch weather. Give advice. Launch it.',
    scaffoldCode:
      '# Build the Weather Buddy\n# 1. Get city from input\n# 2. Fetch weather from wttr.in\n# 3. Print temp and advice\n\n',
  },
  {
    id: 9,
    title: 'Showcase Arena',
    subtitle: 'Present your best work',
    district: 'Arena District',
    xpReward: 250,
    briefText: 'NOVA: The arena is ready. Show the city what you built.',
    scaffoldCode:
      '# Write any Python program that does something useful\n# Make it impressive\n\n',
  },
  {
    id: 10,
    title: 'Bug Hunt',
    subtitle: 'Fix 5 bugs before time runs out',
    district: 'Terminal City',
    xpReward: 300,
    briefText:
      'NOVA: 5 programs are broken. Find the bugs. Fix them fast.',
    scaffoldCode: `# Bug 1: Fix this\nprint('Hello World\n"`,
  },
]
