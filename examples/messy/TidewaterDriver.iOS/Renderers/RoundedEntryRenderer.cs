using TidewaterDriver.Controls;
using TidewaterDriver.iOS.Renderers;
using UIKit;
using Xamarin.Forms;
using Xamarin.Forms.Platform.iOS;

[assembly: ExportRenderer(typeof(RoundedEntry), typeof(RoundedEntryRenderer))]

namespace TidewaterDriver.iOS.Renderers
{
    public class RoundedEntryRenderer : EntryRenderer
    {
        protected override void OnElementChanged(ElementChangedEventArgs<Entry> e)
        {
            base.OnElementChanged(e);
            if (Control == null || !(e.NewElement is RoundedEntry entry))
            {
                return;
            }
            Control.BorderStyle = UITextBorderStyle.None;
            Control.Layer.CornerRadius = (float)entry.CornerRadius;
            Control.Layer.BorderWidth = 1;
            Control.Layer.BorderColor = entry.BorderColor.ToCGColor();
        }
    }
}
