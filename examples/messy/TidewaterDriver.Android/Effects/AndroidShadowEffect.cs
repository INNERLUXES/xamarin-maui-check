using TidewaterDriver.Droid.Effects;
using Xamarin.Forms;
using Xamarin.Forms.Platform.Android;

[assembly: ResolutionGroupName("Tidewater")]
[assembly: ExportEffect(typeof(AndroidShadowEffect), "ShadowEffect")]

namespace TidewaterDriver.Droid.Effects
{
    public class AndroidShadowEffect : PlatformEffect
    {
        protected override void OnAttached()
        {
            Control?.SetShadowLayer(6f, 0f, 3f, Android.Graphics.Color.DarkGray);
        }

        protected override void OnDetached()
        {
        }
    }
}
