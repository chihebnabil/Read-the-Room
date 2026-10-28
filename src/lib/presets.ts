import type { AgeBand, Kind } from './types'

export interface Preset {
  id: string
  label: string
  blurb: string
  text: string
  /** Pre-tagged references so the demo does not depend on the model's extraction. [line, surface, name, kind, role] */
  refs: [number, string, string, Kind, string][]
}

export const PRESETS: Preset[] = [
  {
    id: 'standup',
    label: 'Stand-up set',
    blurb: '12 lines, 11 references',
    text: [
      "I moved in with my girlfriend and found out she watches Yellowstone like it's a documentary about her family.",
      "She quotes Matthew McConaughey like he's a life coach. Alright, alright, alright.",
      'Our first date was at Whole Foods. I paid nine dollars for a water that had been to college.',
      'Her dad owns a YETI cooler that costs more than my car, and honestly he trusts it more than me.',
      "I tried to bond with him over Nickelback. He looked at me like I'd brought a casserole to a funeral.",
      "Now I play Fortnite with her twelve-year-old cousin, who has called me things my therapist hasn't.",
      'On our road trip she made us stop at every H-E-B like it was a national park.',
      'A man in a Patagonia vest asked me to keep my voice down in the tortilla aisle.',
      "Her mom only listens to Taylor Swift, and she grades me like I'm one of the exes.",
      'For our anniversary we went to Whataburger, because nothing says forever like a Number 1 at two in the morning.',
      'I fell asleep to The Joe Rogan Experience and woke up owning an ice bath.',
      "Anyway, we're very happy. Goodnight!",
    ].join('\n'),
    refs: [
      [0, 'Yellowstone', 'Yellowstone', 'tv_show', 'a show her family-loving girlfriend treats as gospel'],
      [1, 'Matthew McConaughey', 'Matthew McConaughey', 'person', 'a laid-back celebrity she treats like a guru'],
      [2, 'Whole Foods', 'Whole Foods Market', 'brand', 'an overpriced, bougie grocery store'],
      [3, 'YETI', 'YETI', 'brand', 'an expensive status purchase a dad is proud of'],
      [4, 'Nickelback', 'Nickelback', 'artist', 'a band people love to hate'],
      [5, 'Fortnite', 'Fortnite', 'video_game', 'a game kids play and trash-talk in'],
      [6, 'H-E-B', 'H-E-B', 'brand', 'a beloved local chain people treat like a landmark'],
      [7, 'Patagonia', 'Patagonia', 'brand', 'an outdoorsy status brand worn by uptight people'],
      [8, 'Taylor Swift', 'Taylor Swift', 'artist', 'a pop star famous for songs about exes'],
      [9, 'Whataburger', 'Whataburger', 'brand', 'a cheap, beloved late-night fast-food spot for a date'],
      [10, 'The Joe Rogan Experience', 'The Joe Rogan Experience', 'podcast', 'a podcast that talks you into wellness fads'],
    ],
  },
  {
    id: 'keynote',
    label: 'Keynote opener',
    blurb: 'Sales kickoff, 6 references',
    text: [
      "Good morning! I know some of you only came for the coffee, and honestly, same.",
      "Last year our team had more drama than an episode of Succession.",
      'But we turned it around, and we did it like Ted Lasso: with optimism and a lot of biscuits.',
      "Our pipeline grew faster than a Peloton instructor's ego.",
      'And our new product launch had the energy of Top Gun: Maverick: loud, expensive, and nobody aged.',
      "We pitched like we were on Shark Tank, minus the part where Mark Cuban buys us.",
      'This year, we are going to run the business the way Beyoncé runs a tour: on time, flawless, and sold out.',
      'Let us get to work.',
    ].join('\n'),
    refs: [
      [1, 'Succession', 'Succession', 'tv_show', 'a drama about a dysfunctional company'],
      [2, 'Ted Lasso', 'Ted Lasso', 'tv_show', 'an optimistic coach who believes in his team'],
      [3, 'Peloton', 'Peloton', 'brand', 'a fitness brand with famously intense instructors'],
      [4, 'Top Gun: Maverick', 'Top Gun: Maverick', 'movie', 'a loud, expensive blockbuster with ageless stars'],
      [5, 'Mark Cuban', 'Mark Cuban', 'person', 'a famous investor'],
      [6, 'Beyoncé', 'Beyoncé', 'artist', 'a perfectionist superstar whose tours sell out'],
    ],
  },
]

export const CITIES = ['Nashville', 'Brooklyn', 'Austin', 'Salt Lake City', 'Los Angeles', 'Chicago', 'Boston', 'Atlanta']

export const TOUR_DEFAULT = ['Austin', 'Nashville', 'Brooklyn', 'Salt Lake City', 'Los Angeles', 'Chicago']

export const VENUES: { id: string; label: string; age: AgeBand | null }[] = [
  { id: 'club', label: 'Comedy club', age: null },
  { id: 'college', label: 'College show', age: '24_and_younger' },
  { id: 'corporate', label: 'Corporate gig', age: '35_to_44' },
  { id: 'casino', label: 'Casino theater', age: '55_and_older' },
]
