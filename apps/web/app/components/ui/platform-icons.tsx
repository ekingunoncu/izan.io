import {
  siJira,
  siGithub,
  siNotion,
  siWhatsapp,
  siTrello,
  siX,
  siDiscord,
  siReddit,
  siTelegram,
  siGooglesheets,
  siYoutube,
  siSpotify,
  siAirtable,
  siFigma,
  siInstagram,
  siTiktok,
  siGooglecalendar,
  siGmail,
  siFacebook,
  siIndeed,
  siBookingdotcom,
  siAirbnb,
  siPinterest,
  siEbay,
  siShopify,
  siCoinmarketcap,
  siGooglenews,
  siGlassdoor,
  siTripadvisor,
  siThreads,
  siGooglescholar,
  siEtsy,
  siZillow,
  siWikipedia,
  siTwitch,
  siImdb,
  siYelp,
  siAliexpress,
  siQuora,
  siBluesky,
  siMedium,
  siSubstack,
  siStackoverflow,
  siExpedia,
  siSoundcloud,
  siRottentomatoes,
  siProducthunt,
  siCoursera,
  siUdemy,
  siGooglemaps,
  siKaggle,
  siHuggingface,
  siStrava,
  siGoodreads,
  siCoinbase,
  siDiscogs,
  siLetterboxd,
  siTodoist,
  siDuolingo,
  siTinder,
  siStockx,
  siArxiv,
  siInternetarchive,
  siBandcamp,
  siLastdotfm,
  siOpensea,
  siUntappd,
  siVivino,
  siYcombinator,
} from 'simple-icons';
import {
  MessageSquare,
  Briefcase,
  ShoppingCart,
  Plane,
  TrendingUp,
  Store,
  Palette,
  Newspaper,
  Dumbbell,
  Trophy,
  Tv,
} from 'lucide-react';

interface IconProps {
  className?: string;
}

// Helper: creates a React component from simple-icons data
function siIcon(si: { path: string }) {
  return ({ className }: IconProps) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className={className}>
      <path d={si.path} fill="currentColor" />
    </svg>
  );
}

// Icons from simple-icons library
export const JiraIcon = siIcon(siJira);
export const GitHubIcon = siIcon(siGithub);
export const NotionIcon = siIcon(siNotion);
export const WhatsAppIcon = siIcon(siWhatsapp);
export const TrelloIcon = siIcon(siTrello);
export const XIcon = siIcon(siX);
export const DiscordIcon = siIcon(siDiscord);
export const RedditIcon = siIcon(siReddit);
export const TelegramIcon = siIcon(siTelegram);
export const GoogleSheetsIcon = siIcon(siGooglesheets);
export const YouTubeIcon = siIcon(siYoutube);
export const SpotifyIcon = siIcon(siSpotify);
export const AirtableIcon = siIcon(siAirtable);
export const FigmaIcon = siIcon(siFigma);
export const InstagramIcon = siIcon(siInstagram);
export const TikTokIcon = siIcon(siTiktok);
export const GoogleCalendarIcon = siIcon(siGooglecalendar);
export const GmailIcon = siIcon(siGmail);
export const FacebookIcon = siIcon(siFacebook);
export const IndeedIcon = siIcon(siIndeed);
export const BookingIcon = siIcon(siBookingdotcom);
export const AirbnbIcon = siIcon(siAirbnb);
export const PinterestIcon = siIcon(siPinterest);
export const EbayIcon = siIcon(siEbay);
export const ShopifyIcon = siIcon(siShopify);
export const CoinMarketCapIcon = siIcon(siCoinmarketcap);
export const GoogleNewsIcon = siIcon(siGooglenews);
export const GlassdoorIcon = siIcon(siGlassdoor);
export const TripAdvisorIcon = siIcon(siTripadvisor);
export const ThreadsIcon = siIcon(siThreads);
export const GoogleScholarIcon = siIcon(siGooglescholar);
export const EtsyIcon = siIcon(siEtsy);
export const ZillowIcon = siIcon(siZillow);
export const WikipediaIcon = siIcon(siWikipedia);
export const TwitchIcon = siIcon(siTwitch);
export const IMDbIcon = siIcon(siImdb);
export const YelpIcon = siIcon(siYelp);
export const AliExpressIcon = siIcon(siAliexpress);
export const QuoraIcon = siIcon(siQuora);
export const BlueskyIcon = siIcon(siBluesky);
export const MediumIcon = siIcon(siMedium);
export const SubstackIcon = siIcon(siSubstack);
export const StackOverflowIcon = siIcon(siStackoverflow);
export const ExpediaIcon = siIcon(siExpedia);
export const SoundCloudIcon = siIcon(siSoundcloud);
export const RottenTomatoesIcon = siIcon(siRottentomatoes);
export const ProductHuntIcon = siIcon(siProducthunt);
export const CourseraIcon = siIcon(siCoursera);
export const UdemyIcon = siIcon(siUdemy);
export const GoogleMapsIcon = siIcon(siGooglemaps);
export const KaggleIcon = siIcon(siKaggle);
export const HuggingFaceIcon = siIcon(siHuggingface);
export const StravaIcon = siIcon(siStrava);
export const GoodreadsIcon = siIcon(siGoodreads);
export const CoinbaseIcon = siIcon(siCoinbase);
export const DiscogsIcon = siIcon(siDiscogs);
export const LetterboxdIcon = siIcon(siLetterboxd);
export const TodoistIcon = siIcon(siTodoist);
export const DuolingoIcon = siIcon(siDuolingo);
export const TinderIcon = siIcon(siTinder);
export const StockXIcon = siIcon(siStockx);
export const ArxivIcon = siIcon(siArxiv);
export const WaybackIcon = siIcon(siInternetarchive);
export const BandcampIcon = siIcon(siBandcamp);
export const LastfmIcon = siIcon(siLastdotfm);
export const OpenSeaIcon = siIcon(siOpensea);
export const UntappdIcon = siIcon(siUntappd);
export const VivinoIcon = siIcon(siVivino);

// Icons not in simple-icons — using related lucide/simple-icons alternatives
export const SlackIcon = MessageSquare;
export const LinkedInIcon = Briefcase;
export const AmazonIcon = ShoppingCart;
export const HackerNewsIcon = siIcon(siYcombinator);
export const GoogleFlightsIcon = Plane;
export const YahooFinanceIcon = TrendingUp;
export const WalmartIcon = Store;
export const CanvaIcon = Palette;
export const CraigslistIcon = Newspaper;
export const MyFitnessPalIcon = Dumbbell;
export const TransfermarktIcon = Trophy;
export const ESPNIcon = Tv;
