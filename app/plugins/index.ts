import { PlugInfo } from '../PluginManager';
import LatexPlugin from './LatexPlugin';
import SentimentPlugin from './SentimentPlugin';

export default function plugArray(): PlugInfo[] {
    return [LatexPlugin(), SentimentPlugin()];
}
