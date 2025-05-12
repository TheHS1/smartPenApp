import { PlugInfo } from './PluginManager';
import LatexPlugin from './LatexPlugin';
import SentimentPlugin from './SentimentPlugin';
import WeatherPlugin from './WeatherPlugin';

export default function plugArray(): PlugInfo[] {
    return [WeatherPlugin(), SentimentPlugin(), LatexPlugin()];
}
