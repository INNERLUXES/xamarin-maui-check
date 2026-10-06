using Xamarin.Forms;

namespace TidewaterDriver.Effects
{
    // The shared side of the shadow effect; the Android project holds the platform effect.
    public class ShadowEffect : RoutingEffect
    {
        public ShadowEffect() : base("Tidewater.ShadowEffect")
        {
        }
    }
}
